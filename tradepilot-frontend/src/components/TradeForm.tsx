import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Direction, TradeInput, TradeResult } from '../types/trade'
import FormField, { inputClasses } from './FormField'
import { uploadScreenshot } from '../services/uploadService'

type TradeFormProps = {
  initialValues?: Partial<TradeInput>
  onSubmit: (input: TradeInput) => Promise<void>
  submitLabel: string
  isSubmitting: boolean
  accountId: string
}

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export default function TradeForm({
  initialValues,
  onSubmit,
  submitLabel,
  isSubmitting,
  accountId,
}: TradeFormProps) {
  const [pair, setPair] = useState(initialValues?.pair ?? '')
  const [direction, setDirection] = useState<Direction>(initialValues?.direction ?? 'BUY')
  const [entry, setEntry] = useState(initialValues?.entry ?? '')
  const [sl, setSl] = useState(initialValues?.sl ?? '')
  const [tp, setTp] = useState(initialValues?.tp ?? '')
  const [timeframe, setTimeframe] = useState(initialValues?.timeframe ?? '')
  const [result, setResult] = useState<TradeResult | ''>(initialValues?.result ?? '')
  const [notes, setNotes] = useState(initialValues?.notes ?? '')

  const [imageUrl, setImageUrl] = useState<string | undefined>(initialValues?.imageUrl ?? undefined)
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(initialValues?.imageUrl ?? undefined)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    if (!pair.trim()) {
      newErrors.pair = 'Pair is required'
    }

    const entryNum = parseFloat(String(entry))
    if (!entry || isNaN(entryNum) || entryNum <= 0) {
      newErrors.entry = 'Entry must be a positive number'
    }

    const slNum = parseFloat(String(sl))
    if (!sl || isNaN(slNum) || slNum <= 0) {
      newErrors.sl = 'SL must be a positive number'
    }

    const tpNum = parseFloat(String(tp))
    if (!tp || isNaN(tpNum) || tpNum <= 0) {
      newErrors.tp = 'TP must be a positive number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setUploadError('')

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setUploadError('Screenshot must be a PNG, JPEG, or WEBP image')
      event.target.value = ''
      return
    }

    if (file.size > MAX_SCREENSHOT_BYTES) {
      setUploadError('Screenshot must be under 5MB')
      event.target.value = ''
      return
    }

    const localPreview = URL.createObjectURL(file)
    setPreviewUrl(localPreview)
    setIsUploading(true)

    try {
      const uploadedUrl = await uploadScreenshot(file)
      setImageUrl(uploadedUrl)
      setPreviewUrl(uploadedUrl)
    } catch (err) {
      setUploadError('Screenshot upload failed')
      console.error(err)
    } finally {
      setIsUploading(false)
    }
  }

  function handleRemoveScreenshot() {
    setImageUrl(undefined)
    setPreviewUrl(undefined)
    setUploadError('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!validate()) {
      return
    }

    await onSubmit({
      accountId,
      pair: pair.trim(),
      direction,
      entry: parseFloat(String(entry)),
      sl: parseFloat(String(sl)),
      tp: parseFloat(String(tp)),
      timeframe: timeframe.trim() || undefined,
      result: result || undefined,
      notes: notes.trim() || undefined,
      imageUrl: imageUrl || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Pair" error={errors.pair}>
        <input
          className={inputClasses}
          name="pair"
          onChange={(event) => setPair(event.target.value)}
          type="text"
          value={pair}
        />
      </FormField>

      <FormField label="Direction">
        <select
          className={inputClasses}
          name="direction"
          onChange={(event) => setDirection(event.target.value as Direction)}
          required
          value={direction}
        >
          <option value="BUY">BUY</option>
          <option value="SELL">SELL</option>
        </select>
      </FormField>

      <FormField label="Entry" error={errors.entry}>
        <input
          className={inputClasses}
          name="entry"
          onChange={(event) => setEntry(event.target.value)}
          required
          step="0.0001"
          type="number"
          value={entry}
        />
      </FormField>

      <FormField label="Stop Loss (SL)" error={errors.sl}>
        <input
          className={inputClasses}
          name="sl"
          onChange={(event) => setSl(event.target.value)}
          required
          step="0.0001"
          type="number"
          value={sl}
        />
      </FormField>

      <FormField label="Take Profit (TP)" error={errors.tp}>
        <input
          className={inputClasses}
          name="tp"
          onChange={(event) => setTp(event.target.value)}
          required
          step="0.0001"
          type="number"
          value={tp}
        />
      </FormField>

      <FormField label="Timeframe (optional)">
        <input
          className={inputClasses}
          name="timeframe"
          onChange={(event) => setTimeframe(event.target.value)}
          type="text"
          value={timeframe}
        />
      </FormField>

      <FormField label="Result (optional)">
        <select
          className={inputClasses}
          name="result"
          onChange={(event) => setResult(event.target.value as TradeResult | '')}
          value={result}
        >
          <option value="">None</option>
          <option value="WIN">WIN</option>
          <option value="LOSS">LOSS</option>
          <option value="BE">BE</option>
        </select>
      </FormField>

      <FormField label="Notes (optional)">
        <textarea
          className={inputClasses}
          name="notes"
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          value={notes}
        />
      </FormField>

      <FormField label="Screenshot (optional)" error={uploadError}>
        <input
          accept="image/png,image/jpeg,image/webp"
          className={inputClasses}
          onChange={handleFileChange}
          type="file"
        />
        {previewUrl && (
          <div className="mt-2 flex items-center gap-3">
            <img
              alt="Trade screenshot preview"
              className="h-20 w-20 rounded-md border border-border-subtle object-cover"
              src={previewUrl}
            />
            <div className="flex flex-col gap-1">
              {isUploading && <span className="text-sm text-text-muted">Uploading...</span>}
              <button
                className="text-sm text-negative hover:opacity-80"
                onClick={handleRemoveScreenshot}
                type="button"
              >
                Remove
              </button>
            </div>
          </div>
        )}
      </FormField>

      <button
        className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting || isUploading}
        type="submit"
      >
        {isSubmitting ? 'Submitting...' : submitLabel}
      </button>
    </form>
  )
}