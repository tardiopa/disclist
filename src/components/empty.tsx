"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function Empty({ text, onAdd }: { text: string; onAdd: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-6 border-t border-line py-28 text-center">
      <div className="w-28 -translate-x-[10%]">
        <div className="sleeve">
          <div className="wax wax-out" />
          <div className="sleeve-art !bg-surface" />
        </div>
      </div>
      <p className="text-lg text-muted">{text}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <button onClick={onAdd} className="btn btn-primary">
          <Plus size={16} />
          {t("addFirst")}
        </button>
        <Link href="/settings" className="btn btn-ghost">
          {t("importFromDiscogs")}
        </Link>
      </div>
    </div>
  );
}
