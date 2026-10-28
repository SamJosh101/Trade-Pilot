import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Direction, TradeInput, TradeResult } from '../types/trade'
import {validDecimal,compareDecimal,plannedRatio} from '../utils/decimal'
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
  const uploadVersion = useRef(0)
  const previewRef = useRef<string | undefined>(undefined)

  useEffect(() => () => {
    ++uploadVersion.current
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
  }, [])

  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    if (!pair.trim()) {
      newErrors.pair = 'Pair is required'
    }

    const validEntry=validDecimal(String(entry),38,18,true),validSl=validDecimal(String(sl),38,18,true),validTp=validDecimal(String(tp),38,18,true)
    if(!validEntry)newErrors.entry='Entry must be a positive decimal string within 38,18 precision'
    if(!validSl)newErrors.sl='Stop loss must be a positive decimal string within 38,18 precision'
    if(!validTp)newErrors.tp='Take profit must be a positive decimal string within 38,18 precision'
    if(validEntry&&validSl&&(direction==='BUY'?compareDecimal(String(sl),String(entry))>=0:compareDecimal(String(sl),String(entry))<=0))newErrors.sl='Stop loss must be below entry for BUY and above entry for SELL'
    if(validEntry&&validTp&&(direction==='BUY'?compareDecimal(String(tp),String(entry))<=0:compareDecimal(String(tp),String(entry))>=0))newErrors.tp='Take profit must be above entry for BUY and below entry for SELL'

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
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = localPreview
    const version = ++uploadVersion.current
    setPreviewUrl(localPreview)
    setIsUploading(true)

    try {
      const uploadedUrl = await uploadScreenshot(file)
      if (version !== uploadVersion.current) return
      setImageUrl(uploadedUrl)
      setPreviewUrl(uploadedUrl)
    } catch (err) {
      if (version !== uploadVersion.current) return
      setUploadError('Screenshot upload failed')
      setPreviewUrl(imageUrl)
      console.error(err)
    } finally {
      if (version === uploadVersion.current) setIsUploading(false)
      URL.revokeObjectURL(localPreview)
    }
  }

  function handleRemoveScreenshot() {
    ++uploadVersion.current
    setIsUploading(false)
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
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
      entry: String(entry),
      sl: String(sl),
      tp: String(tp),
      timeframe: timeframe.trim() || null,
      result: result || null,
      notes: notes.trim() || null,
      imageUrl: imageUrl || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="form-grid trade-setup-form">
      <div className="full form-section-intro"><span className="section-marker">Plan</span><h2>Trade setup</h2><p>Define the position before recording its outcome.</p></div>
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
          inputMode="decimal"
          type="text"
          value={entry}
        />
      </FormField>

      <FormField label="Stop Loss (SL)" error={errors.sl}>
        <input
          className={inputClasses}
          name="sl"
          onChange={(event) => setSl(event.target.value)}
          required
          inputMode="decimal"
          type="text"
          value={sl}
        />
      </FormField>

      <FormField label="Take Profit (TP)" error={errors.tp}>
        <input
          className={inputClasses}
          name="tp"
          onChange={(event) => setTp(event.target.value)}
          required
          inputMode="decimal"
          type="text"
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

      <div className="full form-section-intro journal-divider"><span className="section-marker">Review</span><h2>Trade journal</h2><p>Your notes, chart and recorded journal outcome.</p></div>
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

      <div className="full"><FormField label="Notes (optional)">
        <textarea
          className={inputClasses}
          name="notes"
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          value={notes}
        />
      </FormField>

      </div><div className="full"><FormField label="Screenshot (optional)" error={uploadError}>
        <p className="text-xs text-text-muted">New uploads are disabled pending verified owned media storage. Existing links remain available; removing a link does not delete the remote file.</p>
        <input
          accept="image/png,image/jpeg,image/webp"
          disabled
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

      </div><p className="full notice">Planned RR preview: <strong>{plannedRatio(direction,String(entry),String(sl),String(tp))??'Unknown'}</strong>. Exact geometry only; the saved planned RR remains authoritative. This is not actual realized R.</p><button
        className="full w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-bg-base transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting || isUploading}
        type="submit"
      >
        {isSubmitting ? 'Submitting...' : submitLabel}
      </button>
    </form>
  )
}
