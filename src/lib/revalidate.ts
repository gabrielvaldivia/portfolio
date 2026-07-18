import { revalidatePath } from 'next/cache'

export function revalidatePublicPaths(paths: Array<null | string | undefined>) {
  const uniquePaths = [...new Set(paths.filter((path): path is string => Boolean(path)))]

  for (const path of uniquePaths) {
    try {
      revalidatePath(path)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`Unable to revalidate "${path}": ${message}`)
    }
  }
}
