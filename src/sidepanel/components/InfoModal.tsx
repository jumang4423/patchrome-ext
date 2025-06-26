import React from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '../../components/ui/dialog'
import { Github, User } from 'lucide-react'

interface InfoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const InfoModal: React.FC<InfoModalProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="animate-in fade-in-0 zoom-in-95 duration-300 ease-out data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
        <DialogHeader className="animate-in slide-in-from-top-2 duration-300 ease-out delay-75">
          <DialogTitle className="flex items-center gap-3 text-lg font-semibold text-gray-900">
            <div className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center shadow-sm animate-in zoom-in-0 duration-300 ease-out delay-150 hover:scale-105 transition-transform">
              <span className="text-gray-600 font-bold text-lg">P</span>
            </div>
            <span className="animate-in slide-in-from-left-2 duration-300 ease-out delay-200">
              Patchrome
            </span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 mt-4">
          <div className="flex items-center gap-3 animate-in slide-in-from-bottom-2 duration-300 ease-out delay-300 hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors">
            <div className="w-8 h-8 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
              <User className="w-4 h-4 text-gray-500" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">Creator</div>
              <div className="text-sm text-gray-600">jumang4423</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 animate-in slide-in-from-bottom-2 duration-300 ease-out delay-[400ms] hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors group">
            <div className="w-8 h-8 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center group-hover:bg-gray-100 transition-colors">
              <Github className="w-4 h-4 text-gray-500 group-hover:text-gray-700 transition-colors" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">Source Code</div>
              <a 
                href="https://github.com/jumang4423/patchrome-ext" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors duration-200"
              >
                github.com/jumang4423/patchrome-ext
              </a>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default InfoModal
