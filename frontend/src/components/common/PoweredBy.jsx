// "Powered by <product>" credit; falls back to the original developer credit
// when no product brand has been set yet.
export default function PoweredBy({ brand, version, linkColor }) {
  if (!brand?.productName) {
    return (
      <>
        Developed by{" "}
        <a href="https://www.linkedin.com/in/abhishekwani18/" target="_blank" rel="noopener noreferrer" style={{ color: linkColor, textDecoration: "underline" }}>
          Abhishek Wani
        </a>{" "}
        | Version {version}
      </>
    );
  }
  const label = brand.poweredByText || `Powered by ${brand.productName}${brand.companyName ? ` · ${brand.companyName}` : ""}`;
  return (
    <>
      {brand.website ? (
        <a href={brand.website} target="_blank" rel="noopener noreferrer" style={{ color: linkColor, textDecoration: "underline" }}>
          {label}
        </a>
      ) : (
        label
      )}{" "}
      | Version {version}
    </>
  );
}
