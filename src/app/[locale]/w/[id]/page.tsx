"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { db } from "@/lib/firebase"
import { doc, getDoc, collection, query, orderBy, onSnapshot } from "firebase/firestore"
import { Wishlist, WishlistItem } from "@/lib/wishlists"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { useDictionary } from "@/i18n/DictionaryContext"

export default function PublicWishlistView() {
    const { dict, locale } = useDictionary()
    const params = useParams()
    const router = useRouter()
    const wishlistId = params.id as string

    const [wishlist, setWishlist] = useState<Wishlist | null>(null)
    const [items, setItems] = useState<WishlistItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!wishlistId) return

        const fetchWishlist = async () => {
            try {
                const docRef = doc(db, "wishlists", wishlistId)
                const docSnap = await getDoc(docRef)

                if (!docSnap.exists()) {
                    setError(dict.publicView.notFound)
                    setLoading(false)
                    return
                }

                const data = docSnap.data()
                if (!data?.isPublic) {
                    setError(dict.publicView.private)
                    setLoading(false)
                    return
                }

                setWishlist({ ...data, id: docSnap.id } as Wishlist)

                const itemsRef = collection(db, "wishlists", wishlistId, "items")
                const q = query(itemsRef, orderBy("addedAt", "desc"))

                const unsubscribe = onSnapshot(q, (snapshot) => {
                    const itemsData: WishlistItem[] = []
                    snapshot.forEach((doc) => {
                        itemsData.push({ ...doc.data(), id: doc.id } as WishlistItem)
                    })
                    setItems(itemsData)
                    setLoading(false)
                })

                return () => unsubscribe()

            } catch (err) {
                console.error("Error fetching public wishlist:", err)
                setError(dict.publicView.notFound)
                setLoading(false)
            }
        }

        fetchWishlist()
    }, [wishlistId, dict.publicView.notFound, dict.publicView.private])

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mx-auto" />
                    <p className="mt-4 text-slate-600 font-medium">{dict.publicView.loading}</p>
                </div>
            </div>
        )
    }

    if (error || !wishlist) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-md text-center">
                    <CardContent className="pt-10 pb-8">
                        <div className="h-16 w-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <XCircle className="h-8 w-8" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">{error}</h3>
                        <p className="text-slate-600 mb-6">{dict.publicView.errorMessage}</p>
                        <Button onClick={() => router.push(`/${locale}`)} className="w-full">
                            {dict.publicView.goHome}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-6xl mx-auto p-4 lg:p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 flex items-center justify-center">
                            <svg width="48" height="48" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="50" cy="50" r="48" fill="#111"/>
                                <circle cx="50" cy="50" r="40" fill="none" stroke="#2a2a2a" strokeWidth="1.5"/>
                                <circle cx="50" cy="50" r="34" fill="none" stroke="#2a2a2a" strokeWidth="1.5"/>
                                <circle cx="50" cy="50" r="28" fill="none" stroke="#2a2a2a" strokeWidth="1.5"/>
                                <circle cx="50" cy="50" r="22" fill="none" stroke="#2a2a2a" strokeWidth="1.5"/>
                                <circle cx="50" cy="50" r="16" fill="#e8e0d0"/>
                                <circle cx="50" cy="50" r="3" fill="#111"/>
                            </svg>
                        </div>
                        <h1 className="text-3xl font-black text-black tracking-tight">
                            Disclist
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Card className="bg-black border-none shadow-md py-2">
                            <CardContent className="py-1.5 px-4 flex items-center gap-3">
                                <div className="text-white">
                                    <p className="text-sm font-bold">{dict.publicView.ctaText}</p>
                                </div>
                                <Button
                                    onClick={() => router.push(`/${locale}`)}
                                    variant="secondary"
                                    size="sm"
                                    className="font-bold whitespace-nowrap"
                                >
                                    {dict.publicView.ctaButton}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Content */}
                <Card>
                    <CardHeader>
                        <CardTitle>{wishlist.name} ({items.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {items.length === 0 ? (
                            <div className="text-center py-10 text-slate-500">
                                {dict.dashboard.emptyWishlist}
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[80px]">{dict.dashboard.cover}</TableHead>
                                        <TableHead>{dict.dashboard.albumDetails}</TableHead>
                                        <TableHead>{dict.dashboard.used}</TableHead>
                                        <TableHead>{dict.dashboard.new}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <AnimatePresence>
                                        {items.map((item) => (
                                            <motion.tr
                                                key={item.id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.2, ease: "easeOut" }}
                                                className="group hover:bg-slate-50 transition-colors"
                                            >
                                                <TableCell>
                                                    <div className="h-12 w-12 relative bg-slate-100 rounded overflow-hidden">
                                                        {item.coverUrl && (
                                                            <Image
                                                                src={item.coverUrl}
                                                                alt={item.album}
                                                                fill
                                                                className="object-cover"
                                                                sizes="48px"
                                                            />
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{item.album}</div>
                                                    <div className="text-slate-500">{item.artist} ({item.year})</div>
                                                </TableCell>
                                                <TableCell className="align-top">
                                                    <PublicPriceDisplay item={item} />
                                                </TableCell>
                                                <TableCell className="align-top">
                                                    <PublicNewPriceDisplay item={item} />
                                                </TableCell>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function PublicPriceDisplay({ item }: { item: WishlistItem }) {
    const { dict } = useDictionary()
    const [priceData, setPriceData] = useState<{ lowest: number | null; average: number | null; numForSale: number } | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchPrice = async () => {
            try {
                const res = await fetch(`/api/price?id=${item.discogsId}&type=${item.type || 'release'}`)
                const data = await res.json()
                setPriceData(data)
            } catch (error) {
                console.error('Error fetching price:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchPrice()
    }, [item.discogsId, item.type])

    const getRarity = (numForSale: number) => {
        if (numForSale < 5) return { label: dict.prices.veryRare, color: 'text-red-600' }
        if (numForSale < 15) return { label: dict.prices.rare, color: 'text-amber-600' }
        return { label: dict.prices.common, color: 'text-green-600' }
    }

    if (loading) return <div className="text-xs text-slate-400">{dict.loading}</div>

    if (!priceData || !priceData.lowest) {
        return (
            <Button asChild variant="outline" size="sm" className="h-7 text-xs px-3 min-w-[70px]">
                <a href={`https://www.discogs.com/${item.type || 'release'}/${item.discogsId}`} target="_blank">
                    Discogs
                </a>
            </Button>
        )
    }

    const rarity = getRarity(priceData.numForSale)

    return (
        <div className="space-y-1.5">
            <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900">
                    {dict.prices.from} {priceData.lowest.toFixed(2)}€
                </span>
                <Button asChild variant="outline" size="sm" className="h-7 text-xs px-3 min-w-[70px]">
                    <a href={`https://www.discogs.com/${item.type || 'release'}/${item.discogsId}`} target="_blank">
                        Discogs
                    </a>
                </Button>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                {priceData.average && (
                    <span>{dict.prices.avg}: {priceData.average.toFixed(2)}€</span>
                )}
                {priceData.average && <span className="text-slate-400">•</span>}
                <span className={rarity.color}>{rarity.label}</span>
                <span className="text-slate-500">({priceData.numForSale} {dict.prices.forSale})</span>
            </div>
        </div>
    )
}

function PublicNewPriceDisplay({ item }: { item: WishlistItem }) {
    const { dict } = useDictionary()

    const getPriceLink = (item: WishlistItem, source: 'fnac' | 'cultura' | 'discogs') => {
        const query = `${item.artist} ${item.album} vinyl`
        if (source === 'fnac') return `https://www.fnac.com/SearchResult/ResultList.aspx?Search=${encodeURIComponent(query)}`
        if (source === 'cultura') return `https://www.cultura.com/search/results?search_query=${encodeURIComponent(query)}`
        if (source === 'discogs') return `https://www.discogs.com/${item.type || 'release'}/${item.discogsId}`
        return '#'
    }

    return (
        <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
                {item.culturaPrice ? (
                    <>
                        <span className="text-sm font-semibold text-slate-900">
                            {dict.prices.from} {item.culturaPrice.toFixed(2)}€
                        </span>
                        <Button asChild variant="outline" size="sm" className="h-7 text-xs px-3 min-w-[70px]">
                            <a href={getPriceLink(item, 'cultura')} target="_blank">Cultura</a>
                        </Button>
                    </>
                ) : (
                    <Button asChild variant="outline" size="sm" className="h-7 text-xs px-3 min-w-[70px]">
                        <a href={getPriceLink(item, 'cultura')} target="_blank">Cultura</a>
                    </Button>
                )}
                <Button asChild variant="outline" size="sm" className="h-7 text-xs px-3 min-w-[70px]">
                    <a href={getPriceLink(item, 'fnac')} target="_blank">Fnac</a>
                </Button>
            </div>
        </div>
    )
}

function XCircle(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <path d="m15 9-6 6" />
            <path d="m9 9 6 6" />
        </svg>
    )
}
