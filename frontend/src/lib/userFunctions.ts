import { API_URL } from '@/lib/constants'
import { getDataFromApi } from '@/lib/api'

export function isValidFunctionName(name: string): boolean {
  return /^[A-Z][A-Za-z0-9_]*$/.test(name)
}

export function extractFunctionNames(src: string): string[] {
  const re = /(^|\b)function\s+([A-Za-z_]\w*)\s*\(/g
  const names: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(src)) !== null) names.push(m[2])
  return names
}

export function matchesSingleFunctionOnly(src: string, expectedName: string): { ok: boolean; msg?: string } {
  const trimmed = src.trim()
  const names = extractFunctionNames(trimmed)
  if (names.length === 0) return { ok: false, msg: 'Ciało musi zawierać jedną funkcję.' }
  if (names.length > 1) return { ok: false, msg: 'Nie możesz definiować wielu funkcji w jednym ciele.' }
  const found = names[0]
  if (found !== expectedName) return { ok: false, msg: `Nazwa funkcji w ciele ('${found}') musi być równa nazwie '${expectedName}'.` }
  const exactRe = new RegExp(`^\\s*function\\s+${expectedName}\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*\\}\\s*$`)
  if (!exactRe.test(trimmed)) return { ok: false, msg: 'Kod poza definicją funkcji jest niedozwolony.' }
  return { ok: true }
}

export async function notifyUserFunctionsUpdate() {
  try {
    if (!API_URL) return
    const resp = await getDataFromApi(`${API_URL}/users/functions/update`, 'POST', undefined)
    if (!resp.ok) {
      const text = await resp.text().catch(() => '')
      console.error('Functions update notify failed', resp.status, text || resp.statusText)
    }
  } catch (e) {
    console.error('Functions update notify error', e)
  }
}

export async function transpileToPython(body: string): Promise<string | undefined> {
  const src = body.trim()
  if (!src) return undefined
  try {
    const resp = await getDataFromApi(`${API_URL}/transpile`, 'POST', { code: src })
    if (!resp.ok) return undefined
    const data = await resp.json().catch(() => null) as { python?: string } | null
    const py = data?.python || ''
    return py ? py.split('\n').slice(2).join('\n') : undefined
  } catch {
    return undefined
  }
}


export async function runPython(python: string): Promise<unknown> {
  try {
    const resp = await getDataFromApi(`${API_URL}/run/python`, 'POST', { python })
    if (!resp.ok) return null
    const data = await resp.json().catch(() => null)
    return data?.results ?? null
  } catch {
    return null
  }
}

export function normalizeDescription(desc: unknown): string | undefined {
  if (typeof desc !== 'string') return undefined
  const d = desc.trim()
  return d.length ? d : undefined
}

export async function validateAndTranspile(
  expectedName: string,
  sourceBody: string
): Promise<{ attempted: boolean; ok: boolean; msg?: string; transpiled?: string }> {
  const src = typeof sourceBody === 'string' ? sourceBody : ''
  const trimmed = src.trim()
  if (!trimmed) return { attempted: false, ok: true }

  const structure = matchesSingleFunctionOnly(src, expectedName)
  if (!structure.ok) return { attempted: false, ok: false, msg: structure.msg }

  const transpiled = await transpileToPython(src)
  if (!transpiled) return { attempted: true, ok: false, msg: 'Niepoprawny kod' }
  return { attempted: true, ok: true, transpiled }
}

export async function transpileToPythonRaw(body: string): Promise<string | undefined> {
  const src = body.trim()
  if (!src) return undefined
  try {
    const resp = await getDataFromApi(`${API_URL}/transpile`, 'POST', { code: src })
    if (!resp.ok) return undefined
    const data = await resp.json().catch(() => null) as { python?: string } | null
    return data?.python || undefined
  } catch {
    return undefined
  }
}

export function mapZodToErrors(err: unknown): Record<string, string> {
  const errors: Record<string, string> = {}
  if (err && typeof err === 'object' && 'issues' in err) {
    const zErr = err as { issues: { path: (string|number)[]; message: string }[] }
    zErr.issues.forEach(i => {
      const key = i.path[0]
      if (typeof key === 'string' && !errors[key]) errors[key] = i.message
    })
  }
  return errors
}

export function validateOnSentOnly(src: string): { ok: boolean; msg?: string } {
  const trimmed = src.trim()
  if (!trimmed) return { ok: true }
  const full = trimmed.match(/^\s*function\s+onSent\s*\(([^)]*)\)\s*\{[\s\S]*\}\s*$/)
  if (!full) return { ok: false, msg: 'Niepoprawna definicja funkcji onSent().' }
  const params = (full[1] || '').trim()
  if (params.length) return { ok: false, msg: 'onSent nie może przyjmować parametrów.' }
  return { ok: true }
}