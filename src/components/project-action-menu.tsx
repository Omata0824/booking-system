"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type ProjectActionMenuProps = {
  projectId?: string;
  slug: string;
};

export function ProjectActionMenu({ projectId, slug }: ProjectActionMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  return (
    <div ref={menuRef} className="relative self-start">
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="メニュー"
        className="rounded-xl border border-slate-200 px-3 py-2 text-lg leading-none text-slate-500 hover:bg-slate-50"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        ☰
      </button>
      {open && (
        <div
          className="absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-sm font-semibold shadow-lg"
          role="menu"
        >
          <Link
            className="block px-4 py-2 text-slate-700 hover:bg-slate-50"
            href={`/admin/projects/${slug}`}
            role="menuitem"
          >
            編集
          </Link>
          <form action="/admin/projects/delete" method="post">
            <input name="projectId" type="hidden" value={projectId ?? ""} />
            <button
              className="block w-full px-4 py-2 text-left text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-300"
              disabled={!projectId}
              onClick={(event) => {
                if (!window.confirm("このカレンダーを削除しますか？予約履歴がある場合は非公開になります。")) {
                  event.preventDefault();
                }
              }}
              role="menuitem"
              type="submit"
            >
              削除
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
