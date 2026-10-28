import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { AccountInput } from '../types/account'
import FormField, { inputClasses } from './FormField'
import BrokerSelect from './BrokerSelect'
import AccountAvatar from './AccountAvatar'
import { uploadScreenshot } from '../services/uploadService'
import { getBrokerById } from '../constants/brokers'

const MAX_AVATAR_BYTES = 5 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']

type AccountFormProps = {
  initialValues?: Partial<AccountInput>
  onSubmit: (input: AccountInput) => Promise<void>
  submitLabel: string
  isSubmitting: boolean
  accountTypes?: string[]
  currencies?: string[]
}

export default function AccountForm({
  initialValues,
  onSubmit,
  submitLabel,
  isSubmitting,
  accountTypes = ['Standard', 'Cent', 'Demo', 'Raw Spread', 'ECN', 'Other'],
  currencies = ['USD', 'EUR', 'GBP', 'NGN'],
}: AccountFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '')
  const [brokerId, setBrokerId] = useState(initialValues?.brokerId ?? '')
  const [brokerChanged, setBrokerChanged] = useState(false)
  const [accountType, setAccountType] = useState(initialValues?.accountType ?? '')
  const [startingBalance, setStartingBalance] = useState(
    initialValues?.startingBalance !== undefined ? String(initialValues.startingBalance) : '',
  )
  const [currency, setCurrency] = useState(initialValues?.currency ?? 'USD')

  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(initialValues?.avatarUrl ?? undefined)
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(initialValues?.avatarUrl ?? undefined)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const previewRef = useRef<string | undefined>(undefined)
  const uploadVersion = useRef(0)
  useEffect(() => () => {
    ++uploadVersion.current
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
  }, [])

  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = 'Name is required'
    }

    const balanceNum = parseFloat(startingBalance)
    if (!startingBalance || !Number.isFinite(balanceNum) || balanceNum < 0) {
      newErrors.startingBalance = 'Starting balance cannot be negative'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setUploadError('')

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setUploadError('Avatar must be a PNG, JPEG, or WEBP image')
      event.target.value = ''
      return
    }

    if (file.size > MAX_AVATAR_BYTES) {
      setUploadError('Avatar must be under 5MB')
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
      setAvatarUrl(uploadedUrl)
      setPreviewUrl(uploadedUrl)
    } catch (err) {
      if (version !== uploadVersion.current) return
      setUploadError('Avatar upload failed')
      console.error(err)
      setPreviewUrl(avatarUrl)
    } finally {
      if (version === uploadVersion.current) setIsUploading(false)
      URL.revokeObjectURL(localPreview)
    }
  }

  function handleRemoveAvatar() {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    setAvatarUrl(undefined)
    setPreviewUrl(undefined)
    setUploadError('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isUploading || !validate()) {
      return
    }

    const selectedBroker = brokerId ? getBrokerById(brokerId) : undefined

    await onSubmit({
      name: name.trim(),
      broker: brokerChanged ? selectedBroker?.name ?? null : initialValues?.broker ?? selectedBroker?.name ?? null,
      brokerId: brokerChanged ? selectedBroker?.id ?? null : initialValues?.brokerId ?? selectedBroker?.id ?? null,
      brokerName: brokerChanged ? selectedBroker?.name ?? null : initialValues?.brokerName ?? selectedBroker?.name ?? null,
      brokerLogo: brokerChanged ? selectedBroker?.logoUrl ?? null : initialValues?.brokerLogo ?? selectedBroker?.logoUrl ?? null,
      avatarUrl: avatarUrl || null,
      accountType: accountType.trim() || null,
      startingBalance: parseFloat(startingBalance),
      currency: currency.trim() || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-text-primary">Avatar (optional)</label>
        <p className="text-xs text-text-muted">New uploads are disabled pending verified owned media storage. Existing avatars remain available; removing a link does not delete the remote file.</p>
        <div className="flex items-center gap-4">
          <AccountAvatar name={name || 'Account'} avatarUrl={previewUrl || null} size="lg" />
          <div className="flex flex-col gap-2">
            <input
              type="file"
              aria-label="Account avatar"
              accept={ACCEPTED_IMAGE_TYPES.join(',')}
              onChange={handleAvatarChange}
              disabled
              className="text-sm text-text-muted file:mr-4 file:rounded-chip file:border-0 file:bg-bg-surface file:px-4 file:py-2 file:text-sm file:font-medium file:text-text-primary hover:file:bg-bg-surface-hover disabled:opacity-50"
            />
            {previewUrl && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={isUploading}
                className="text-sm text-negative hover:underline disabled:opacity-50"
              >
                Remove avatar
              </button>
            )}
          </div>
        </div>
        {uploadError && (
          <p className="text-sm text-negative">{uploadError}</p>
        )}
        {isUploading && (
          <p className="text-sm text-text-muted">Uploading...</p>
        )}
      </div>

      <FormField label="Name" error={errors.name}>
        <input
          className={inputClasses}
          name="name"
          onChange={(event) => setName(event.target.value)}
          type="text"
          value={name}
        />
      </FormField>

      <FormField label="Broker (optional)">
        <BrokerSelect
          value={brokerId}
          onChange={(id) => { setBrokerId(id); setBrokerChanged(true) }}
        />
      </FormField>

      <FormField label="Account Type (optional)">
        <select
          className={inputClasses}
          name="accountType"
          onChange={(event) => setAccountType(event.target.value)}
          value={accountType}
        >
          <option value="">Select account type...</option>
          {accountTypes.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </FormField>

      <FormField label="Starting Balance" error={errors.startingBalance}>
        <input
          className={inputClasses}
          name="startingBalance"
          onChange={(event) => setStartingBalance(event.target.value)}
          required
          step="0.01"
          type="number"
          value={startingBalance}
        />
      </FormField>

      <FormField label="Currency (optional)">
        <select
          className={inputClasses}
          name="currency"
          onChange={(event) => setCurrency(event.target.value)}
          value={currency}
        >
          {currencies.map((curr) => (
            <option key={curr} value={curr}>{curr}</option>
          ))}
        </select>
      </FormField>

      <button
        className="w-full rounded-card bg-accent px-4 py-2.5 text-sm font-medium text-bg-base transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting || isUploading}
        type="submit"
      >
        {isSubmitting ? 'Submitting...' : submitLabel}
      </button>
    </form>
  )
}
