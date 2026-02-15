"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Copy, Check } from "lucide-react"
import { Wishlist, togglePublic } from "@/lib/wishlists"
import { useDictionary } from "@/i18n/DictionaryContext"

interface ShareModalProps {
    open: boolean
    onClose: () => void
    wishlist: Wishlist
    onWishlistUpdate: () => void
}

export function ShareModal({ open, onClose, wishlist, onWishlistUpdate }: ShareModalProps) {
    const { dict, locale } = useDictionary()
    const [copied, setCopied] = useState(false)
    const [isToggling, setIsToggling] = useState(false)

    const shareUrl = `${window.location.origin}/${locale}/w/${wishlist.id}`

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleTogglePublic = async (checked: boolean) => {
        setIsToggling(true)
        try {
            await togglePublic(wishlist.id, checked)
            onWishlistUpdate()
        } catch (error) {
            console.error("Error toggling public status:", error)
        } finally {
            setIsToggling(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{dict.share.title}</DialogTitle>
                    <DialogDescription>{dict.share.description}</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Public Toggle */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                        <div className="flex-1">
                            <p className="text-sm font-medium">{dict.share.publicAccess}</p>
                            <p className="text-xs text-slate-500">
                                {wishlist.isPublic ? dict.share.publicOn : dict.share.publicOff}
                            </p>
                        </div>
                        <Switch
                            checked={wishlist.isPublic}
                            onCheckedChange={handleTogglePublic}
                            disabled={isToggling}
                            className="cursor-pointer"
                        />
                    </div>

                    {/* Copy Link */}
                    <AnimatePresence>
                        {wishlist.isPublic && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-2"
                            >
                                <Label>{dict.share.shareLink}</Label>
                                <div className="flex gap-2">
                                    <Input readOnly value={shareUrl} className="bg-slate-50" />
                                    <Button size="icon" variant="outline" onClick={handleCopy}>
                                        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                </div>

                <DialogFooter className="sm:justify-end">
                    <Button type="button" variant="default" onClick={onClose}>
                        {dict.done}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
