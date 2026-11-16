"use client";

import { Empty } from "@/components/empty";
import { LibraryView } from "@/components/library-view";
import { useLibrary } from "@/components/library";
import { useUi } from "@/components/shell";
import { useI18n } from "@/lib/i18n";

export default function CollectionPage() {
  const { t } = useI18n();
  const { collection, loading } = useLibrary();
  const { openAdd, openDetail } = useUi();
  if (loading) return null;
  return (
    <LibraryView
      list="collection"
      title={t("collection")}
      items={collection}
      onOpen={(item) => openDetail({ base: item, list: "collection" })}
      empty={<Empty text={t("emptyCollection")} onAdd={openAdd} />}
    />
  );
}
