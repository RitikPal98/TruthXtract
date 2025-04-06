import { Github, Twitter, Linkedin, Mail } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-truth-medium/60 backdrop-blur-md py-8 px-4 sm:px-6 lg:px-8 relative z-10">
      <p style={{ margin: "0 auto", textAlign: "center" }}></p>
    </footer>
  );
};

export default Footer;
