"use client"

import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useEffect, useState, useRef, useCallback } from "react"
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { DiscogsRelease } from "@/types"
import { Wishlist, WishlistItem, createWishlist, getWishlists, getSessionWishlists, updateWishlist, deleteWishlist as deleteWishlistFn } from "@/lib/wishlists"
import Image from "next/image"
import { Search, Plus, Trash2, LogOut, X, Check, RefreshCw, Share, Menu } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Sidebar } from "@/components/sidebar"
import { NewWishlistModal } from "@/components/new-wishlist-modal"
import { EditWishlistModal } from "@/components/edit-wishlist-modal"
import { DeleteWishlistDialog } from "@/components/delete-wishlist-dialog"
import { MigrationModal } from "@/components/migration-modal"
import { ShareModal } from "@/components/share-modal"
import { useDictionary } from "@/i18n/DictionaryContext"

export default function Dashboard() {
  const { dict } = useDictionary()
  const { user, logout, signInWithGoogle, loading, isAdmin, hasPendingMigration, sessionId } = useAuth()

  // Wishlist management
  const [wishlists, setWishlists] = useState<Wishlist[]>([])
  const [currentWishlistId, setCurrentWishlistId] = useState<string | null>(null)
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([])
  const [isCreatingDefault, setIsCreatingDefault] = useState(false)

  // Search
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<DiscogsRelease[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [addingItemId, setAddingItemId] = useState<number | null>(null)

  // Modals
  const [showNewWishlistModal, setShowNewWishlistModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingWishlist, setEditingWishlist] = useState<Wishlist | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingWishlist, setDeletingWishlist] = useState<Wishlist | null>(null)
  const [showMigrationModal, setShowMigrationModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)

  // Mobile sidebar
  const [mobileOpen, setMobileOpen] = useState(false)

  // Prices
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false)

  const searchContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadWishlists = useCallback(async () => {
    try {
      let lists: Wishlist[] = []

      if (user) {
        lists = await getWishlists(user.uid)
      } else if (sessionId) {
        lists = await getSessionWishlists(sessionId)
      }

      setWishlists(lists)

      if (lists.length > 0) {
        setCurrentWishlistId(prev => {
          if (!prev || !lists.find(l => l.id === prev)) {
            return lists[0].id
          }
          return prev
        })
      } else if (!user && sessionId && !isCreatingDefault) {
        setIsCreatingDefault(true)
        try {
          const newWishlist = await createWishlist(
            dict.migration.placeholder,
            null,
            sessionId
          )
          setWishlists([newWishlist])
          setCurrentWishlistId(newWishlist.id)
        } catch (error) {
          console.error('Error creating default wishlist:', error)
        } finally {
          setIsCreatingDefault(false)
        }
      } else {
        setCurrentWishlistId(null)
      }
    } catch (error) {
      console.error('Error loading wishlists:', error)
    }
  }, [user, sessionId, isCreatingDefault, dict.migration.placeholder])

  useEffect(() => {
    loadWishlists()
  }, [loadWishlists])

  useEffect(() => {
    if (hasPendingMigration && user) {
      setShowMigrationModal(true)
    }
  }, [hasPendingMigration, user])

  useEffect(() => {
    setWishlistItems([])

    if (!currentWishlistId) return

    const itemsRef = collection(db, 'wishlists', currentWishlistId, 'items')
    const q = query(itemsRef, orderBy('addedAt', 'desc'))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: WishlistItem[] = []
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as WishlistItem)
      })
      setWishlistItems(items)

      if (addingItemId !== null && items.some(item => item.discogsId === addingItemId)) {
        setAddingItemId(null)
      }
    }, (error) => {
      console.error('Error loading wishlist items:', error)
    })

    return () => unsubscribe()
  }, [currentWishlistId, addingItemId])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length < 3) {
        setSearchResults([])
        setShowDropdown(false)
        return
      }

      setIsSearching(true)
      setShowDropdown(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
        const data = await res.json()
        if (data.results) {
          setSearchResults(data.results.slice(0, 5))
        }
      } catch (error) {
        console.error("Search error", error)
      } finally {
        setIsSearching(false)
      }
    }, 500)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery])

  const handleCreateWishlist = async (name: string) => {
    try {
      const newWishlist = await createWishlist(
        name,
        user?.uid || null,
        user ? null : (sessionId || null)
      )
      await loadWishlists()
      setCurrentWishlistId(newWishlist.id)
    } catch (error) {
      console.error('Error creating wishlist:', error)
      throw error
    }
  }

  const handleEditWishlist = (id: string) => {
    const wishlist = wishlists.find(w => w.id === id)
    if (wishlist) {
      setEditingWishlist(wishlist)
      setShowEditModal(true)
    }
  }

  const handleUpdateWishlist = async (name: string) => {
    if (!editingWishlist) return
    try {
      await updateWishlist(editingWishlist.id, { name })
      await loadWishlists()
    } catch (error) {
      console.error('Error updating wishlist:', error)
      throw error
    }
  }

  const handleDeleteWishlist = (id: string) => {
    const wishlist = wishlists.find(w => w.id === id)
    if (wishlist) {
      setDeletingWishlist(wishlist)
      setShowDeleteDialog(true)
    }
  }

  const confirmDeleteWishlist = async () => {
    if (!deletingWishlist) return
    try {
      await deleteWishlistFn(deletingWishlist.id)

      if (currentWishlistId === deletingWishlist.id) {
        const remaining = wishlists.filter(w => w.id !== deletingWishlist.id)
        setCurrentWishlistId(remaining.length > 0 ? remaining[0].id : null)
      }

      await loadWishlists()
    } catch (error) {
      console.error('Error deleting wishlist:', error)
      throw error
    }
  }

  const addToWishlist = async (release: DiscogsRelease) => {
    if (!currentWishlistId) return

    const alreadyExists = wishlistItems.some(item => item.discogsId === release.id)
    if (alreadyExists) return

    setAddingItemId(release.id)
    try {
      const [artist, ...albumParts] = release.title.split(' - ')
      const album = albumParts.join(' - ')

      await addDoc(collection(db, 'wishlists', currentWishlistId, 'items'), {
        discogsId: release.id,
        type: release.type,
        artist: artist || 'Unknown',
        album: album || release.title,
        year: release.year || 'N/A',
        coverUrl: release.cover_image || release.thumb || '',
        addedAt: Date.now()
      })
    } catch (error) {
      console.error("Error adding to wishlist", error)
      setAddingItemId(null)
    }
  }

  const isItemInWishlist = (releaseId: number) => {
    return wishlistItems.some(item => item.discogsId === releaseId) || addingItemId === releaseId
  }

  const removeFromWishlist = async (itemId: string) => {
    if (!currentWishlistId) return
    try {
      await deleteDoc(doc(db, 'wishlists', currentWishlistId, 'items', itemId))
    } catch (error) {
      console.error("Error removing from wishlist", error)
    }
  }

  const refreshPrices = async () => {
    if (!user || !currentWishlistId || wishlistItems.length === 0) return

    setIsRefreshingPrices(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/scrape-prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ items: wishlistItems })
      })

      if (!response.ok) throw new Error('Scraping failed')

      const { prices } = await response.json()

      const { updateDoc } = await import('firebase/firestore')
      const updatePromises = Object.entries(prices).map(async ([itemId, itemPrices]: [string, any]) => {
        const { fnac, cultura } = itemPrices
        const docRef = doc(db, 'wishlists', currentWishlistId, 'items', itemId)

        if (fnac !== null || cultura !== null) {
          await updateDoc(docRef, {
            fnacPrice: fnac,
            culturaPrice: cultura,
            pricesFetchedAt: Date.now()
          })
        }
      })

      await Promise.all(updatePromises)
    } catch (error) {
      console.error('Error refreshing prices:', error)
    } finally {
      setIsRefreshingPrices(false)
    }
  }

  const clearSearch = () => {
    setSearchQuery("")
    setSearchResults([])
    setShowDropdown(false)
    inputRef.current?.focus()
  }

  const currentWishlist = wishlists.find(w => w.id === currentWishlistId)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
          <p className="mt-4 text-slate-600">{dict.loading}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {user && (
        <Sidebar
          wishlists={wishlists}
          currentWishlistId={currentWishlistId}
          onSelectWishlist={setCurrentWishlistId}
          onNewWishlist={() => setShowNewWishlistModal(true)}
          onEditWishlist={handleEditWishlist}
          onDeleteWishlist={handleDeleteWishlist}
          onSignIn={signInWithGoogle}
          user={user}
          mobileOpen={mobileOpen}
          onMobileToggle={() => setMobileOpen(o => !o)}
        />
      )}

      <div className="flex-1 min-w-0 overflow-x-hidden">
        <div className="max-w-6xl mx-auto px-3 py-4 lg:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 lg:mb-8">
            <div className="flex items-center gap-2 lg:gap-3">
              {user && (
                <Button
                  variant="outline"
                  size="icon"
                  className="lg:hidden h-9 w-9 shrink-0"
                  onClick={() => setMobileOpen(o => !o)}
                >
                  {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </Button>
              )}
              <div className="h-8 w-8 lg:h-12 lg:w-12 flex items-center justify-center shrink-0">
                <svg width="100%" height="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="50" cy="50" r="48" fill="#111"/>
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#2a2a2a" strokeWidth="1.5"/>
                  <circle cx="50" cy="50" r="34" fill="none" stroke="#2a2a2a" strokeWidth="1.5"/>
                  <circle cx="50" cy="50" r="28" fill="none" stroke="#2a2a2a" strokeWidth="1.5"/>
                  <circle cx="50" cy="50" r="22" fill="none" stroke="#2a2a2a" strokeWidth="1.5"/>
                  <circle cx="50" cy="50" r="16" fill="#e8e0d0"/>
                  <circle cx="50" cy="50" r="3" fill="#111"/>
                </svg>
              </div>
              <h1 className="text-xl lg:text-3xl font-black text-black tracking-tight">
                Disclist
              </h1>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {user ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600 hidden sm:inline">
                    {dict.hello}, {user.displayName?.split(' ')[0] || 'User'}
                  </span>
                  <Button variant="outline" size="icon" className="lg:hidden h-9 w-9" onClick={logout} title={dict.signOut}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={logout} className="hidden lg:flex">
                    <LogOut className="h-4 w-4 mr-2" />
                    {dict.signOut}
                  </Button>
                </div>
              ) : (
                <Button variant="default" size="sm" onClick={signInWithGoogle} className="font-bold shadow-md">
                  {dict.signIn}
                </Button>
              )}
            </div>
          </div>

          {/* No wishlist state */}
          {user && wishlists.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <h3 className="text-lg font-semibold mb-2">{dict.dashboard.welcome}</h3>
                <p className="text-slate-600 mb-4">{dict.dashboard.welcomeSubtitle}</p>
                <div className="flex flex-col items-center gap-4">
                  <Button onClick={() => setShowNewWishlistModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {dict.dashboard.createWishlist}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main content */}
          {currentWishlist && (
            <>
              {/* Search Card */}
              <Card className="mb-3 lg:mb-6">
                <CardHeader>
                  <CardTitle>{dict.dashboard.findVinyl}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative" ref={searchContainerRef}>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                      <Input
                        ref={inputRef}
                        type="text"
                        placeholder={dict.dashboard.searchPlaceholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => searchQuery.length >= 3 && setShowDropdown(true)}
                        className="pl-10 pr-10"
                      />
                      {searchQuery && (
                        <button
                          onClick={clearSearch}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      )}
                    </div>

                    {showDropdown && (
                      <div className="absolute z-10 w-full mt-2 bg-white border rounded-lg shadow-lg max-h-96 overflow-y-auto">
                        {isSearching ? (
                          <div className="p-4 text-center text-slate-500">{dict.dashboard.searching}</div>
                        ) : searchResults.length === 0 ? (
                          <div className="p-4 text-center text-slate-500">{dict.dashboard.noResults}</div>
                        ) : (
                          <div className="divide-y">
                            {searchResults.map((result) => (
                              <div key={result.id} className="p-3 hover:bg-slate-50 transition-colors">
                                <a
                                  href={`https://www.discogs.com/${result.type}/${result.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex gap-3 group"
                                >
                                  <div className="h-12 w-12 bg-slate-100 rounded overflow-hidden flex-shrink-0">
                                    {result.thumb && (
                                      <Image
                                        src={result.thumb}
                                        alt={result.title}
                                        width={48}
                                        height={48}
                                        className="object-cover"
                                        sizes="48px"
                                      />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate group-hover:text-slate-900">
                                      {result.title}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                      {result.year} • {result.format?.join(', ')}
                                    </div>
                                  </div>
                                  {isItemInWishlist(result.id) ? (
                                    <div className="flex-shrink-0 flex items-center gap-1.5 text-green-600 text-sm font-medium">
                                      <Check className="h-4 w-4" />
                                      <span>{dict.dashboard.added}</span>
                                    </div>
                                  ) : (
                                    <Button
                                      size="sm"
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        addToWishlist(result)
                                      }}
                                      disabled={addingItemId === result.id}
                                      className="flex-shrink-0"
                                    >
                                      {addingItemId === result.id ? (
                                        <motion.div
                                          initial={{ scale: 0 }}
                                          animate={{ scale: 1 }}
                                          className="flex items-center gap-1"
                                        >
                                          <Check className="h-4 w-4" />
                                          {dict.dashboard.adding}
                                        </motion.div>
                                      ) : (
                                        <>
                                          <Plus className="h-4 w-4 mr-1" />
                                          {dict.dashboard.add}
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </a>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Guest banner */}
              {!user && currentWishlist && wishlistItems.length > 0 && (
                <Card className="mb-6 bg-slate-50 border-slate-200">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900 mb-1">
                          {dict.dashboard.guestBannerTitle}
                        </p>
                        <p className="text-xs text-slate-600">
                          {dict.dashboard.guestBannerText}
                        </p>
                      </div>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={signInWithGoogle}
                        className="font-bold shadow-md whitespace-nowrap"
                      >
                        {dict.signIn}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Wishlist Table */}
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="mr-auto">{currentWishlist.name} ({wishlistItems.length})</CardTitle>
                    {user && currentWishlist.ownerId === user.uid && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-slate-900 hover:bg-slate-50 gap-2"
                        onClick={() => setShowShareModal(true)}
                      >
                        <Share className="h-4 w-4" />
                        {dict.dashboard.share}
                      </Button>
                    )}
                    {wishlistItems.length > 0 && isAdmin && (
                      <Button
                        onClick={refreshPrices}
                        disabled={isRefreshingPrices}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <RefreshCw className={`h-4 w-4 ${isRefreshingPrices ? 'animate-spin' : ''}`} />
                        {isRefreshingPrices ? dict.dashboard.refreshingPrices : dict.dashboard.refreshPrices}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {wishlistItems.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">
                      {dict.dashboard.emptyWishlist}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">{dict.dashboard.cover}</TableHead>
                          <TableHead>{dict.dashboard.albumDetails}</TableHead>
                          <TableHead>{dict.dashboard.used}</TableHead>
                          <TableHead>{dict.dashboard.new}</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence>
                          {wishlistItems.map((item) => (
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
                                <PriceDisplay item={item} />
                              </TableCell>
                              <TableCell className="align-top">
                                <NewPriceDisplay item={item} />
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeFromWishlist(item.id)}
                                  className="text-slate-400 hover:text-red-600 cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      <NewWishlistModal
        open={showNewWishlistModal}
        onClose={() => setShowNewWishlistModal(false)}
        onConfirm={handleCreateWishlist}
      />
      <EditWishlistModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        onConfirm={handleUpdateWishlist}
        currentName={editingWishlist?.name || ''}
      />
      <DeleteWishlistDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDeleteWishlist}
        wishlistName={deletingWishlist?.name || ''}
      />
      <MigrationModal
        open={showMigrationModal}
        onClose={() => {
          setShowMigrationModal(false)
          loadWishlists()
        }}
      />
      {currentWishlist && (
        <ShareModal
          open={showShareModal}
          onClose={() => setShowShareModal(false)}
          wishlist={currentWishlist}
          onWishlistUpdate={loadWishlists}
        />
      )}
    </div>
  )
}

function PriceDisplay({ item }: { item: WishlistItem }) {
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
      <Button asChild variant="outline" size="sm" className="h-8">
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

function NewPriceDisplay({ item }: { item: WishlistItem }) {
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
