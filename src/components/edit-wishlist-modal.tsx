"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { useDictionary } from "@/i18n/DictionaryContext"

interface EditWishlistModalProps {
    open: boolean
    onClose: () => void
    onConfirm: (name: string) => Promise<void>
    currentName: string
}

export function EditWishlistModal({ open, onClose, onConfirm, currentName }: EditWishlistModalProps) {
    const { dict } = useDictionary()
    const [name, setName] = useState(currentName)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        setName(currentName)
    }, [currentName, open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim() || name === currentName) {
            onClose()
            return
        }

        setLoading(true)
        try {
            await onConfirm(name.trim())
            onClose()
        } catch (error) {
            console.error('Error updating wishlist:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{dict.editWishlist.title}</DialogTitle>
                        <DialogDescription>{dict.editWishlist.description}</DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <Label htmlFor="edit-wishlist-name">{dict.editWishlist.label}</Label>
                        <Input
                            id="edit-wishlist-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={dict.editWishlist.placeholder}
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
                            {dict.save}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
