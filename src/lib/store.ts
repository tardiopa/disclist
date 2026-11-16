// Firestore access. Layout:
//   users/{uid}                 public profile (name, shareId, visibility)
//   users/{uid}/private/discogs token + username, owner only
//   users/{uid}/collection/{id} one document per copy owned
//   users/{uid}/wishlist/{key}  one document per album wanted
//   shares/{shareId}            short link → uid
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "./firebase";
import { mergeWishlist, type CollectionPlan } from "./merge";
import type { DiscogsLink, Item, ListName, NewItem, Profile } from "./types";

const userRef = (uid: string) => doc(db, "users", uid);
const listRef = (uid: string, list: ListName) => collection(db, "users", uid, list);
const itemRef = (uid: string, list: ListName, id: string) => doc(db, "users", uid, list, id);
const discogsRef = (uid: string) => doc(db, "users", uid, "private", "discogs");

/** Firestore rejects `undefined`; drop those fields. */
function clean<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}

const toItem = (d: QueryDocumentSnapshot<DocumentData>): Item => ({ ...(d.data() as NewItem), id: d.id });

function newShareId(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export async function ensureProfile(user: User): Promise<void> {
  const snap = await getDoc(userRef(user.uid));
  if (snap.exists()) return;
  const shareId = newShareId();
  const name = user.displayName || user.email?.split("@")[0] || "";
  await setDoc(doc(db, "shares", shareId), { uid: user.uid });
  await setDoc(userRef(user.uid), {
    shareId,
    name,
    collectionPublic: false,
    wishlistPublic: false,
    createdAt: Date.now(),
  });
}

export function watchProfile(uid: string, cb: (p: Profile | null) => void) {
  return onSnapshot(userRef(uid), (s) => cb(s.exists() ? (s.data() as Profile) : null), () => cb(null));
}

export function watchDiscogs(uid: string, cb: (l: DiscogsLink | null) => void) {
  return onSnapshot(discogsRef(uid), (s) => cb(s.exists() ? (s.data() as DiscogsLink) : null), () => cb(null));
}

export function watchList(uid: string, list: ListName, cb: (items: Item[]) => void) {
  return onSnapshot(listRef(uid, list), (s) => cb(s.docs.map(toItem)), () => cb([]));
}

export const setVisibility = (uid: string, list: ListName, isPublic: boolean) =>
  updateDoc(userRef(uid), { [list === "collection" ? "collectionPublic" : "wishlistPublic"]: isPublic });

export const saveDiscogs = (uid: string, link: DiscogsLink | null) =>
  link ? setDoc(discogsRef(uid), link) : deleteDoc(discogsRef(uid));

/** Collection: a new document per copy. Wishlist: one per album, keyed by it. */
export async function addItem(uid: string, list: ListName, item: NewItem): Promise<void> {
  const ref = list === "wishlist" ? itemRef(uid, list, item.key) : doc(listRef(uid, list));
  await setDoc(ref, clean({ ...item, instanceId: null, addedAt: Date.now() }));
}

export const removeItem = (uid: string, list: ListName, id: string) => deleteDoc(itemRef(uid, list, id));

export const patchItem = (uid: string, list: ListName, id: string, patch: Partial<NewItem>) =>
  updateDoc(itemRef(uid, list, id), clean(patch) as DocumentData);

export async function patchMany(uid: string, targets: { list: ListName; id: string }[], patch: Partial<NewItem>) {
  if (!targets.length) return;
  const batch = writeBatch(db);
  for (const t of targets) batch.update(itemRef(uid, t.list, t.id), clean(patch) as DocumentData);
  await batch.commit();
}

/** Bought it: leaves the wishlist, lands in the collection. */
export async function moveToCollection(uid: string, item: Item): Promise<void> {
  const { id, ...data } = item;
  const batch = writeBatch(db);
  batch.delete(itemRef(uid, "wishlist", id));
  batch.set(doc(listRef(uid, "collection")), clean({ ...data, releaseId: data.masterId ? null : data.releaseId, instanceId: null, addedAt: Date.now() }));
  await batch.commit();
}

const CHUNK = 400;

export async function applyCollectionPlan(uid: string, plan: CollectionPlan): Promise<void> {
  const ops: ((b: ReturnType<typeof writeBatch>) => void)[] = [
    ...plan.create.map((c) => (b: ReturnType<typeof writeBatch>) => b.set(itemRef(uid, "collection", c.id), clean(c.item))),
    ...plan.attach.map((a) => (b: ReturnType<typeof writeBatch>) =>
      b.update(itemRef(uid, "collection", a.id), { instanceId: a.instanceId, releaseId: a.releaseId }),
    ),
  ];
  for (let i = 0; i < ops.length; i += CHUNK) {
    const batch = writeBatch(db);
    ops.slice(i, i + CHUNK).forEach((op) => op(batch));
    await batch.commit();
  }
}

export async function applyWishlistPlan(uid: string, create: { id: string; item: NewItem }[]): Promise<void> {
  for (let i = 0; i < create.length; i += CHUNK) {
    const batch = writeBatch(db);
    create.slice(i, i + CHUNK).forEach((c) => batch.set(itemRef(uid, "wishlist", c.id), clean(c.item)));
    await batch.commit();
  }
}

/* ---------- public pages ---------- */

export interface Shared {
  profile: Profile;
  collection: Item[] | null;
  wishlist: Item[] | null;
}

export async function loadShared(shareId: string): Promise<Shared | null> {
  const share = await getDoc(doc(db, "shares", shareId));
  if (!share.exists()) return null;
  const uid = share.data().uid as string;
  const snap = await getDoc(userRef(uid));
  if (!snap.exists()) return null;
  const profile = snap.data() as Profile;
  const read = async (list: ListName, open: boolean) => {
    if (!open) return null;
    try {
      return (await getDocs(listRef(uid, list))).docs.map(toItem);
    } catch {
      return null;
    }
  };
  const [col, wish] = await Promise.all([
    read("collection", profile.collectionPublic),
    read("wishlist", profile.wishlistPublic),
  ]);
  return { profile, collection: col, wishlist: wish && mergeWishlist(wish) };
}
