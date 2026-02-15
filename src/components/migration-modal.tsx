"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/components/providers/auth-provider"
import { getSessionWishlists, updateWishlist } from "@/lib/wishlists"
import { migrateSessionToUser } from "@/lib/session"
import { Loader2 } from "lucide-react"
import { useDictionary } from "@/i18n/DictionaryContext"

interface MigrationModalProps {
    open: boolean
    onClose: () => void
}

export function MigrationModal({ open, onClose }: MigrationModalProps) {
    const { dict } = useDictionary()
    const { user, sessionId } = useAuth()
    const [wishlistName, setWishlistName] = useState("")
    const [itemCount, setItemCount] = useState(0)
    const [loading, setLoading] = useState(false)
    const [checking, setChecking] = useState(true)
    const [sessionWishlists, setSessionWishlists] = useState<string[]>([])

    useEffect(() => {
        if (open && sessionId) {
            checkSessionWishlists()
        }
    }, [open, sessionId])

    const checkSessionWishlists = async () => {
        if (!sessionId) return

        setChecking(true)
        try {
            const wishlists = await getSessionWishlists(sessionId)

            if (wishlists.length === 0) {
                onClose()
                return
            }

            setSessionWishlists(wishlists.map(w => w.id))

            let totalItems = 0
            for (const wishlist of wishlists) {
                const { getWishlistItems } = await import('@/lib/wishlists')
                const items = await getWishlistItems(wishlist.id)
                totalItems += items.length
            }

            if (totalItems === 0) {
                onClose()
                return
            }

            setItemCount(totalItems)

            const firstName = user?.displayName?.split(' ')[0]
            setWishlistName(firstName ? `${firstName}'s wishlist` : dict.migration.placeholder)

        } catch (error) {
            console.error('Error checking session wishlists:', error)
            onClose()
        } finally {
            setChecking(false)
        }
    }

    const handleMigrate = async () => {
        if (!user || !sessionId) return

        setLoading(true)
        try {
            await migrateSessionToUser(sessionId, user.uid)

            if (sessionWishlists.length > 0 && wishlistName.trim()) {
                const firstWishlistId = sessionWishlists[0]
                await updateWishlist(firstWishlistId, { name: wishlistName.trim() })
            }

            onClose()
        } catch (error) {
            console.error('Error migrating session:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDiscard = () => {
        onClose()
    }

    if (checking) {
        return (
            <Dialog open={open} onOpenChange={onClose}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{dict.migration.checking}</DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                    </div>
                </DialogContent>
            </Dialog>
        )
    }

    const itemLabel = itemCount === 1 ? dict.migration.vinyl : dict.migration.vinyls
    const description = dict.migration.description
        .replace('{count}', String(itemCount))
        .replace('{item}', itemLabel)

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{dict.migration.title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <Label htmlFor="wishlist-name">{dict.migration.label}</Label>
                    <Input
                        id="wishlist-name"
                        value={wishlistName}
                        onChange={(e) => setWishlistName(e.target.value)}
                        placeholder={dict.migration.placeholder}
                        className="mt-2"
                    />
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleDiscard} disabled={loading}>
                        {dict.discard}
                    </Button>
                    <Button onClick={handleMigrate} disabled={loading || !wishlistName.trim()}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {dict.migration.saveWishlist}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
