import ssl
import socket

try:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    with ctx.wrap_socket(socket.socket(), server_hostname="github.com") as s:
        s.connect(("github.com", 443))
        der_cert = s.getpeercert(binary_form=True)
        pem_cert = ssl.DER_cert_to_PEM_cert(der_cert)
        with open("github_cert.pem", "w") as f:
            f.write(pem_cert)
    print("Certificate saved to github_cert.pem")
except Exception as e:
    print(f"Error: {e}")
