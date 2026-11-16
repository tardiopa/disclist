// Live check of the Firestore security rules with a throwaway account.
// Usage: node scripts/check-rules.mjs   (needs .env.local and Email/Password sign-in enabled)
import { initializeApp, deleteApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth, signOut } from "firebase/auth";
import { deleteDoc, doc, getDoc, getDocs, collection, getFirestore, setDoc, updateDoc } from "firebase/firestore";

process.loadEnvFile(".env.local");
const env = (k) => process.env[`NEXT_PUBLIC_FIREBASE_${k}`];
const config = { apiKey: env("API_KEY"), authDomain: env("AUTH_DOMAIN"), projectId: env("PROJECT_ID"), appId: env("APP_ID") };

const owner = initializeApp(config, "owner");
const guest = initializeApp(config, "guest");
const other = initializeApp(config, "other");
const db = getFirestore(owner);
const pub = getFirestore(guest);
const odb = getFirestore(other);

let failed = 0;
const check = async (name, fn, expectOk) => {
  let ok = true;
  try {
    await fn();
  } catch (e) {
    ok = false;
    if (expectOk) console.log("   ", e.code || e.message);
  }
  const pass = ok === expectOk;
  if (!pass) failed++;
  console.log(`${pass ? "✔" : "✖"} ${name} → ${ok ? "allowed" : "denied"}`);
};

const rand = Math.random().toString(36).slice(2, 10);
const mk = (app, tag) => createUserWithEmailAndPassword(getAuth(app), `rules-check-${tag}-${rand}@example.com`, `pw-${rand}-${rand}`);
const me = (await mk(owner, "a")).user;
const stranger = (await mk(other, "b")).user;
const uid = me.uid;
const share = `t${rand}`;
const item = { key: "m1", title: "Test", artist: "Test", list: "x" };

try {
  await check("owner creates share link", () => setDoc(doc(db, "shares", share), { uid }), true);
  await check("owner creates profile", () => setDoc(doc(db, "users", uid), { shareId: share, name: "t", collectionPublic: false, wishlistPublic: false }), true);
  await check("owner saves Discogs token", () => setDoc(doc(db, "users", uid, "private", "discogs"), { token: "x", username: "x" }), true);
  await check("owner adds to collection", () => setDoc(doc(db, "users", uid, "collection", "a"), item), true);
  await check("owner adds to wishlist", () => setDoc(doc(db, "users", uid, "wishlist", "m1"), item), true);
  await check("owner reads own collection", () => getDocs(collection(db, "users", uid, "collection")), true);

  await check("anyone resolves share link", () => getDoc(doc(pub, "shares", share)), true);
  await check("anyone reads public profile", () => getDoc(doc(pub, "users", uid)), true);
  await check("guest reads PRIVATE collection", () => getDocs(collection(pub, "users", uid, "collection")), false);
  await check("guest reads PRIVATE wishlist", () => getDocs(collection(pub, "users", uid, "wishlist")), false);
  await check("guest reads Discogs token", () => getDoc(doc(pub, "users", uid, "private", "discogs")), false);
  await check("other user reads Discogs token", () => getDoc(doc(odb, "users", uid, "private", "discogs")), false);
  await check("other user reads private collection", () => getDocs(collection(odb, "users", uid, "collection")), false);
  await check("other user writes to my collection", () => setDoc(doc(odb, "users", uid, "collection", "evil"), item), false);
  await check("other user edits my profile", () => updateDoc(doc(odb, "users", uid), { collectionPublic: true }), false);
  await check("other user repoints my share link", () => setDoc(doc(odb, "shares", share), { uid: stranger.uid }), false);
  await check("other user claims a link for my uid", () => setDoc(doc(odb, "shares", `x${rand}`), { uid }), false);

  await check("owner makes collection public", () => updateDoc(doc(db, "users", uid), { collectionPublic: true }), true);
  await check("guest reads PUBLIC collection", () => getDocs(collection(pub, "users", uid, "collection")), true);
  await check("guest still cannot read private wishlist", () => getDocs(collection(pub, "users", uid, "wishlist")), false);
  await check("guest cannot write to public collection", () => setDoc(doc(pub, "users", uid, "collection", "evil"), item), false);
  await check("owner makes wishlist public", () => updateDoc(doc(db, "users", uid), { wishlistPublic: true }), true);
  await check("guest reads PUBLIC wishlist", () => getDocs(collection(pub, "users", uid, "wishlist")), true);
  await check("guest still cannot read Discogs token", () => getDoc(doc(pub, "users", uid, "private", "discogs")), false);
} finally {
  // Clean up everything this run created (the share link is write-once by design and stays as an orphan).
  for (const ref of [
    doc(db, "users", uid, "collection", "a"),
    doc(db, "users", uid, "wishlist", "m1"),
    doc(db, "users", uid, "private", "discogs"),
    doc(db, "users", uid),
  ]) await deleteDoc(ref).catch(() => {});
  await me.delete().catch(() => {});
  await stranger.delete().catch(() => {});
  await signOut(getAuth(owner)).catch(() => {});
  await Promise.all([owner, guest, other].map(deleteApp));
}
console.log(failed ? `\n${failed} check(s) FAILED` : "\nAll rules behave as intended");
process.exit(failed ? 1 : 0);
