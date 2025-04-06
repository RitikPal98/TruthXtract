import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlignRight, X } from "lucide-react";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-truth-dark/80 backdrop-blur-md shadow-md"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <a href="/" className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-truth-light animate-glow mr-2"></div>
              <span className="text-xl font-bold text-white glow-text">
                TruthXtract
              </span>
            </a>
          </div>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center space-x-8">
            <a
              href="#features"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-gray-300 hover:text-white transition-colors"
            >
              How it Works
            </a>
            <Button
              className="truth-button"
              onClick={() => (window.location.href = "http://localhost:3000")}
            >
              Get Started
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-300 hover:text-white"
            >
              {isMobileMenuOpen ? <X size={24} /> : <AlignRight size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden glass-panel mx-4 my-2 p-4">
          <div className="flex flex-col space-y-4">
            <a
              href="#features"
              className="text-gray-300 hover:text-white transition-colors py-2 px-4"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-gray-300 hover:text-white transition-colors py-2 px-4"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              How it Works
            </a>
            <Button className="truth-button mx-4">Try It Now</Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
