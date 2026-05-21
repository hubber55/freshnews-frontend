import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let backendResponse = NextResponse.next({ request })

  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ''
  const backendAnonKey =
    process.env.NEXT_PUBLIC_BACKEND_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''

  const backend = createServerClient(backendUrl, backendAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        backendResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          backendResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const {
    data: { session },
  } = await backend.auth.getSession()

  const isLoggedIn = !!session?.user
  const isLoginPage = request.nextUrl.pathname === '/admin/login' || request.nextUrl.pathname.startsWith('/admin/login')
  const isAdminPage = request.nextUrl.pathname.startsWith('/admin')

  if (isAdminPage && !isLoginPage && !isLoggedIn) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    return NextResponse.redirect(url)
  }

  if (isLoginPage && isLoggedIn) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    return NextResponse.redirect(url)
  }

  return backendResponse
}

export const config = {
  matcher: ['/admin/:path*'],
}
