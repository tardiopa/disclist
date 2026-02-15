"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { useDictionary } from "@/i18n/DictionaryContext"

interface NewWishlistModalProps {
    open: boolean
    onClose: () => void
    onConfirm: (name: string) => Promise<void>
}

export function NewWishlistModal({ open, onClose, onConfirm }: NewWishlistModalProps) {
    const { dict } = useDictionary()
    const [name, setName] = useState("")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return

        setLoading(true)
        try {
            await onConfirm(name.trim())
            setName("")
            onClose()
        } catch (error) {
            console.error('Error creating wishlist:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{dict.newWishlist.title}</DialogTitle>
                        <DialogDescription>{dict.newWishlist.description}</DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <Label htmlFor="wishlist-name">{dict.newWishlist.label}</Label>
                        <Input
                            id="wishlist-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={dict.newWishlist.placeholder}
                            className="mt-2"
                            autoFocus
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            {dict.cancel}
                        </Button>
                        <Button type="submit" disabled={loading || !name.trim()}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {dict.create}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
