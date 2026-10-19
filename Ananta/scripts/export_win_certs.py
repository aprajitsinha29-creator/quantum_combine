import ssl

def export_windows_certs(output_path="win_ca_bundle.crt"):
    certs = []
    for store in ["ROOT", "CA"]:
        try:
            for cert_bytes, encoding, trust in ssl.enum_certificates(store):
                if encoding == "x509_asn":
                    pem = ssl.DER_cert_to_PEM_cert(cert_bytes)
                    certs.append(pem)
        except Exception as e:
            print(f"Error reading store {store}: {e}")

    with open(output_path, "w", encoding="utf-8") as f:
        # Also include git's standard certs
        git_ca = r"C:\Program Files\Git\mingw64\etc\ssl\certs\ca-bundle.crt"
        try:
            with open(git_ca, "r", encoding="utf-8") as gf:
                f.write(gf.read() + "\n")
        except Exception as e:
            print(f"Could not read git ca: {e}")

        for pem in certs:
            f.write(pem + "\n")

    print(f"Exported {len(certs)} Windows certificates to {output_path}")

if __name__ == "__main__":
    export_windows_certs()
