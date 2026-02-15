"use client"

import { useState } from "react"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Loader2 } from "lucide-react"
import { useDictionary } from "@/i18n/DictionaryContext"

interface DeleteWishlistDialogProps {
    open: boolean
    onClose: () => void
    onConfirm: () => Promise<void>
    wishlistName: string
}

export function DeleteWishlistDialog({ open, onClose, onConfirm, wishlistName }: DeleteWishlistDialogProps) {
    const { dict } = useDictionary()
    const [loading, setLoading] = useState(false)

    const handleConfirm = async () => {
        setLoading(true)
        try {
            await onConfirm()
            onClose()
        } catch (error) {
            console.error('Error deleting wishlist:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={onClose}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {dict.deleteWishlist.title.replace('{name}', wishlistName)}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {dict.deleteWishlist.description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>{dict.cancel}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {dict.delete}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
