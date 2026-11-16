"use client";

import { LibraryView } from "@/components/library-view";
import { useLibrary } from "@/components/library";
import { useUi } from "@/components/shell";
import { useI18n } from "@/lib/i18n";
import { Empty } from "@/components/empty";

export default function WishlistPage() {
  const { t } = useI18n();
  const { wishlist, loading, gotIt, remove } = useLibrary();
  const { openAdd, openDetail } = useUi();
  if (loading) return null;
  return (
    <LibraryView
      list="wishlist"
      title={t("wishlist")}
      items={wishlist}
      onOpen={(item) => openDetail({ base: item, list: "wishlist" })}
      onGotIt={gotIt}
      onRemove={(item) => remove("wishlist", item.id)}
      empty={<Empty text={t("emptyWishlist")} onAdd={openAdd} />}
    />
  );
}
