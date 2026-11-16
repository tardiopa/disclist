"use client";

import { useState } from "react";
import { Confirm } from "@/components/bits";
import { Empty } from "@/components/empty";
import { LibraryView } from "@/components/library-view";
import { useLibrary } from "@/components/library";
import { useUi } from "@/components/shell";
import { useI18n } from "@/lib/i18n";
import type { Item } from "@/lib/types";

export default function WishlistPage() {
  const { t } = useI18n();
  const { wishlist, loading, remove } = useLibrary();
  const { openAdd, openDetail } = useUi();
  const [removing, setRemoving] = useState<Item | null>(null);
  if (loading) return null;
  return (
    <>
      <LibraryView
        list="wishlist"
        title={t("wishlist")}
        items={wishlist}
        onOpen={(item) => openDetail({ base: item, list: "wishlist" })}
        onRemove={setRemoving}
        empty={<Empty text={t("emptyWishlist")} onAdd={openAdd} />}
      />
      {removing && (
        <Confirm
          title={t("removeTitle")}
          text={
            <>
              <span className="text-ink">{removing.title}</span> — {removing.artist}. {t("removeFromWishlist")}
            </>
          }
          action={t("remove")}
          onCancel={() => setRemoving(null)}
          onConfirm={() => {
            remove("wishlist", removing.id);
            setRemoving(null);
          }}
        />
      )}
    </>
  );
}
