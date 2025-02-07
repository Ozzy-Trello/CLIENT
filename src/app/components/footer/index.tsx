'use client';
import React from "react";

const Footer: React.FC = React.memo(() => {
  return (
    <footer style={{ textAlign: "center", padding: "1rem", width: "100%" }}>
      <p style={{ margin: 0 }}>© {new Date().getFullYear()} Ozzy Clothing. All rights reserved.</p>
      <p style={{ margin: 0 }}>
        <a href="/privacy" style={{ margin: "0 0.5rem" }}>Privacy Policy</a> | 
        <a href="/terms" style={{ margin: "0 0.5rem" }}>Terms of Service</a>
      </p>
    </footer>
  );
}) 

export default Footer;