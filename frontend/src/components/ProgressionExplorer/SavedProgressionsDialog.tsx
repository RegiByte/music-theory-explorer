import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { SavedItem, SavedProgression } from '@/system/favoritesResource'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface SavedProgressionsDialogProps {
  savedProgressions: SavedItem<SavedProgression>[]
  onLoad: (progression: SavedProgression) => void
  onDelete: (id: string) => void
}

export function SavedProgressionsDialog({
  savedProgressions,
  onLoad,
  onDelete,
}: SavedProgressionsDialogProps) {
  const { t } = useTranslation('tools')
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="flex items-center gap-2 border px-3 py-2 rounded-md">
        <span className="whitespace-nowrap">{t('progressionExplorer.loadSaved')}</span>
        {savedProgressions.length > 0 && (
          <Badge variant="secondary" className="ml-1.5 text-[0.625rem] px-1.5 py-0">
            {savedProgressions.length}
          </Badge>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {t('progressionExplorer.savedProgressions')}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-2 mt-2">
          {savedProgressions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t('progressionExplorer.noSavedProgressions')}
            </p>
          ) : (
            savedProgressions.map((item) => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                className="flex items-center gap-3 p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => {
                  onLoad(item.data)
                  setOpen(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onLoad(item.data)
                    setOpen(false)
                  }
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.data.key} {item.data.scaleType} · {item.data.genre} ·{' '}
                    {t('progressionExplorer.chordsLabel', {
                      count: item.data.chords.length,
                    })}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(item.id)
                  }}
                >
                  ✕
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
