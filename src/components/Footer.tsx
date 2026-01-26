const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="py-6 px-4 text-center border-t border-white/5">
      <p className="text-xs text-muted-foreground/60">
        © {currentYear} UniversFlow. All rights reserved.
      </p>
      <p className="text-xs text-muted-foreground/40 mt-1">
        Created by <span className="font-semibold text-primary">SHASHANK YADAV</span>
      </p>
    </footer>
  );
};

export default Footer;
