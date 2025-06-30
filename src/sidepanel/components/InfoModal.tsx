import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Github, User } from "lucide-react";
interface InfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
const InfoModal: React.FC<InfoModalProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-80 animate-in fade-in-0 zoom-in-95 duration-200 ease-out data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 max-w-md p-0 overflow-hidden">
        <div className="px-6 pt-16">
          <DialogHeader className="animate-in slide-in-from-top-2 duration-200 ease-out">
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gray-100 rounded-3xl blur-xl opacity-50"></div>
                <img
                  src={chrome.runtime.getURL("logo.png")}
                  alt="Patchrome Logo"
                  className="relative w-64 h-64 drop-shadow-lg hover:scale-105 transition-transform duration-200"
                />
              </div>
              <DialogTitle className="text-2xl font-medium text-gray-900 tracking-tight">
                Patchrome
              </DialogTitle>
            </div>
          </DialogHeader>
        </div>
        <div className="px-6 pb-6">
          <div className="flex justify-center w-full animate-in fade-in-0 duration-200 delay-100 pb-3">
            <a
              href="https://github.com/jumang4423"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-2xl w-full"
            >
              <img
                src={chrome.runtime.getURL("jumango.gif")}
                className="w-full h-[100px] object-cover rounded-2xl scale-x-[1.2] scale-y-[0.8] group-hover:scale-x-[1.7] group-hover:scale-y-[0.8] transition-transform duration-200"
                alt="jumang4423"
              />
            </a>
          </div>
          <div className="pt-2 border-t border-gray-100">
            <a
              href="https://github.com/jumang4423/patchrome-ext"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 -mx-3 rounded-xl hover:bg-gray-50 transition-colors duration-200 group"
            >
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100 group-hover:shadow-md transition-shadow duration-200">
                <Github className="w-5 h-5 text-gray-700" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  View on GitHub
                </p>
                <p className="text-xs text-gray-500">
                  Star, fork, or contribute
                </p>
              </div>
              <svg
                className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform duration-200"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
export default InfoModal;
