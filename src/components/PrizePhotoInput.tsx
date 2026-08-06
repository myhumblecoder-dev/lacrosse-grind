"use client"

import { useRef, useState } from "react"

export interface PrizePhotoSelection {
  file?: File
  url?: string
}

interface PrizePhotoInputProps {
  existingPhotoUrl?: string | null
  onChange: (selection: PrizePhotoSelection | null) => void
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB — matches uploadPrizePhoto

/**
 * Three ways to give the prize a photo: drop a file, browse for one, or paste
 * an image address. All three resolve to a `PrizePhotoSelection` handed to the
 * parent — nothing uploads here. The upload happens after the Prize row is
 * saved, because the photo attaches to that row.
 */
export default function PrizePhotoInput({
  existingPhotoUrl,
  onChange,
}: PrizePhotoInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(existingPhotoUrl ?? null)
  const [pastedUrl, setPastedUrl] = useState("")
  const [error, setError] = useState<string | null>(null)

  function selectFile(file: File) {
    setError(null)

    if (!file.type.startsWith("image/")) {
      setError("That file is not an image")
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("That image is bigger than 5 MB")
      return
    }

    // Object URL is for the local preview only; the real upload sends the File.
    setPreview(URL.createObjectURL(file))
    setPastedUrl("")
    onChange({ file })
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) selectFile(file)
  }

  function handleUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setPastedUrl(value)
    setError(null)

    const trimmed = value.trim()
    if (!trimmed) {
      setPreview(existingPhotoUrl ?? null)
      onChange(null)
      return
    }
    setPreview(trimmed)
    onChange({ url: trimmed })
  }

  function clearSelection() {
    setPreview(existingPhotoUrl ?? null)
    setPastedUrl("")
    setError(null)
    if (inputRef.current) inputRef.current.value = ""
    onChange(null)
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Photo</span>

      <div
        data-testid="prize-photo-dropzone"
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={
          "flex flex-col items-center gap-2 rounded-lg border border-dashed p-4 text-center " +
          (isDragging
            ? "border-emerald-500 bg-emerald-500/5"
            : "border-zinc-700 bg-zinc-900")
        }
      >
        <p className="text-sm text-zinc-400">Drag an image here</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
        >
          Choose a file
        </button>
        <input
          ref={inputRef}
          data-testid="prize-photo-file"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0]
            if (file) selectFile(file)
          }}
        />
      </div>

      <label htmlFor="prize-photo-url" className="text-sm text-zinc-400">
        …or paste an image link
      </label>
      <input
        id="prize-photo-url"
        data-testid="prize-photo-url"
        type="url"
        value={pastedUrl}
        onChange={handleUrlChange}
        placeholder="https://"
        className="rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-zinc-100"
      />

      {error && (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}

      {preview && (
        <div className="flex items-center gap-3">
          {/* Plain img, not next/image: a blob: object URL or a not-yet-fetched
              remote host is exactly what next/image refuses to render. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            data-testid="prize-photo-preview"
            src={preview}
            alt="Prize photo preview"
            className="h-20 w-20 rounded-lg object-cover"
          />
          <button
            type="button"
            onClick={clearSelection}
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )
}
