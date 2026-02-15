"use client"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Pencil, Trash2, Globe, Lock } from "lucide-react"
import { Wishlist } from "@/lib/wishlists"
import { cn } from "@/lib/utils"
import { User } from "firebase/auth"
import { useDictionary } from "@/i18n/DictionaryContext"
import { LanguageSwitcher } from "@/components/language-switcher"

interface SidebarProps {
    wishlists: Wishlist[]
    currentWishlistId: string | null
    onSelectWishlist: (id: string) => void
    onNewWishlist: () => void
    onEditWishlist: (id: string) => void
    onDeleteWishlist: (id: string) => void
    onSignIn: () => void
    user: User | null
    mobileOpen: boolean
    onMobileToggle: () => void
    className?: string
}

export function Sidebar({
    wishlists,
    currentWishlistId,
    onSelectWishlist,
    onNewWishlist,
    onEditWishlist,
    onDeleteWishlist,
    onSignIn,
    user,
    mobileOpen,
    onMobileToggle,
    className
}: SidebarProps) {
    const { dict } = useDictionary()

    const sidebarContent = (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">{dict.sidebar.myWishlists}</h2>
                    <Button
                        size="sm"
                        onClick={onNewWishlist}
                        className="gap-1"
                    >
                        <Plus className="h-4 w-4" />
                        {dict.sidebar.new}
                    </Button>
                </div>
            </div>

            {/* Wishlist List */}
            <ScrollArea className="flex-1 min-h-0">
                <div className="p-2 space-y-1">
                    {wishlists.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-sm">
                            {dict.sidebar.noWishlists}
                        </div>
                    ) : (
                        wishlists.map((wishlist) => (
                            <div
                                key={wishlist.id}
                                className={cn(
                                    "group relative rounded-lg p-3 cursor-pointer transition-colors",
                                    "hover:bg-slate-100",
                                    currentWishlistId === wishlist.id && "bg-slate-100 border-l-2 border-slate-900 rounded-l-none pl-[10px]"
                                )}
                                onClick={() => {
                                    onSelectWishlist(wishlist.id)
                                    if (mobileOpen) onMobileToggle()
                                }}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm truncate mb-1">
                                            {wishlist.name}
                                        </div>
                                        <div className={`flex items-center gap-1.5 text-xs ${
                                            wishlist.isPublic
                                                ? 'text-emerald-600'
                                                : 'text-slate-400'
                                        }`}>
                                            {wishlist.isPublic ? (
                                                <>
                                                    <Globe className="h-3 w-3" />
                                                    <span>{dict.sidebar.public}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Lock className="h-3 w-3" />
                                                    <span>{dict.sidebar.private}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-6 w-6 hover:bg-slate-200"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onEditWishlist(wishlist.id)
                                            }}
                                        >
                                            <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-6 w-6 hover:bg-red-100 hover:text-red-600"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onDeleteWishlist(wishlist.id)
                                            }}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>

            {/* Footer */}
            <div className="p-2 border-t">
                <LanguageSwitcher />
            </div>
        </div>
    )

    return (
        <>
            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-50"
                    onClick={onMobileToggle}
                />
            )}

            {/* Sidebar - Desktop */}
            <aside
                className={cn(
                    "hidden lg:flex flex-col w-64 border-r bg-white",
                    className
                )}
            >
                {sidebarContent}
            </aside>

            {/* Sidebar - Mobile */}
            <aside
                className={cn(
                    "lg:hidden fixed inset-y-0 left-0 z-[60] w-64 bg-white border-r transform transition-transform duration-200",
                    mobileOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {sidebarContent}
            </aside>
        </>
    )
}
