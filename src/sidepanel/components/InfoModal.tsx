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
      <DialogContent className="w-64 animate-in fade-in-0 zoom-in-95 duration-300 ease-out data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 max-w-sm p-6 pt-16">
        <DialogHeader className="animate-in slide-in-from-top-2 duration-300 ease-out delay-75">
          <div className="flex flex-col items-center space-y-4">
            <img 
              src={chrome.runtime.getURL('logo.png')}
              alt="Patchrome Logo" 
              className="w-32 h-32 animate-in zoom-in-0 duration-300 ease-out delay-150 hover:scale-105 transition-transform"
            />
            <DialogTitle className="text-2xl font-semibold text-gray-900 animate-in slide-in-from-bottom-2 duration-300 ease-out delay-200">
              Patchrome
            </DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="space-y-4 -mt-6">
            <div className="flex justify-center w-full animate-in slide-in-from-bottom-2 duration-300 ease-out delay-300 -mb-4">
                <a 
                    href="https://jumango.dev" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:scale-105 transition-transform duration-200"
                >
                    <img 
                        src={chrome.runtime.getURL('jumango.gif')}
                        className="w-full h-128"
                        alt="jumang4423" 
                    />
                </a>
            </div>
          <div className="bg-gray-50 rounded-xl p-2 animate-in slide-in-from-bottom-2 duration-300 ease-out delay-[400ms]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm">
                <Github className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <a 
                  href="https://github.com/jumang4423/patchrome-ext" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors duration-200"
                >
                    github repo
                </a>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default InfoModal
