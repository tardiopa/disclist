"use client"

import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { useRouter, useParams } from "next/navigation"
import { useEffect } from "react"
import { useDictionary } from "@/i18n/DictionaryContext"

export default function LoginPage() {
    const { dict, locale } = useDictionary()
    const { user, signInWithGoogle, loading } = useAuth()
    const router = useRouter()
    const params = useParams()

    useEffect(() => {
        if (user && !loading) {
            router.push(`/${params.locale}`)
        }
    }, [user, loading, router, params.locale])

    if (loading) return <div className="flex h-screen items-center justify-center">{dict.loading}</div>

    return (
        <div className="flex h-screen items-center justify-center bg-slate-50">
            <div className="text-center space-y-4">
                <h1 className="text-2xl font-bold">Disclist</h1>
                <p className="text-slate-500">{dict.login.subtitle}</p>
                <Button onClick={signInWithGoogle} size="lg">{dict.login.signInWithGoogle}</Button>
            </div>
        </div>
    )
}
