const Footer: React.FC = () => {
  return (
    <footer style={{ textAlign: "center", padding: "1rem", background: "#f0f2f5", borderTop: "1px solid #e8e8e8" }}>
      <p style={{ margin: 0 }}>© 2023 Your Company. All rights reserved.</p>
      <p style={{ margin: 0 }}>
        <a href="/privacy" style={{ margin: "0 0.5rem" }}>Privacy Policy</a> | 
        <a href="/terms" style={{ margin: "0 0.5rem" }}>Terms of Service</a>
      </p>
    </footer>
  );
}

export default Footer;