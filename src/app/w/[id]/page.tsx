import { redirect } from 'next/navigation'
export default function PublicWishlist({ params }: { params: { id: string } }) {
    redirect(`/en/w/${params.id}`)
}
