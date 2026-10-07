import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import aksaraLogo from '@/assets/aksara-logo.png';

// Update both when the policy text changes
const LAST_UPDATED = '7 Oktober 2026';
// Optional: a monitored inbox for privacy questions (not the noreply sender)
const CONTACT_EMAIL = '';

/**
 * Public privacy policy (no login required). Linked from the sign-in page and
 * required by Google for the OAuth consent screen of "Login dengan Google".
 */
export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <img src={aksaraLogo} alt="AKSARA Logo" className="w-7 h-7 object-contain" />
          <span className="text-lg font-bold text-primary">AKSARA</span>
        </Link>
        <Link
          to="/"
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Kembali ke AKSARA</span>
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <article className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-10 prose prose-gray max-w-none prose-headings:text-gray-900 prose-h2:text-lg prose-h2:mt-8 prose-a:text-primary-ink prose-li:my-1">
          <h1 className="!text-2xl !mb-1">Kebijakan Privasi AKSARA</h1>
          <p className="!mt-0 text-sm text-gray-500">Terakhir diperbarui: {LAST_UPDATED}</p>

          <p>
            AKSARA (Asisten Pencarian Sumber Data) adalah aplikasi internal RSUPN Dr. Cipto Mangunkusumo (RSCM)
            yang membantu staf menemukan informasi dari dokumen referensi rumah sakit, seperti peraturan direktur,
            standar prosedur operasional, dan pedoman. Kebijakan ini menjelaskan data apa yang dikumpulkan AKSARA,
            bagaimana data tersebut digunakan, dan pilihan yang Anda miliki.
          </p>

          <h2>1. Data yang kami kumpulkan</h2>
          <ul>
            <li>
              <strong>Data akun:</strong> nama lengkap, alamat email, username, nomor telepon (opsional), dan peran
              Anda di AKSARA (pengguna atau admin).
            </li>
            <li>
              <strong>Jika Anda masuk dengan Google:</strong> nama, alamat email, dan foto profil dari akun Google
              Anda. AKSARA tidak mengakses data Google lainnya seperti Gmail, Google Drive, atau kontak.
            </li>
            <li>
              <strong>Riwayat percakapan:</strong> pertanyaan yang Anda ajukan, jawaban AKSARA, sumber referensi yang
              ditampilkan, judul percakapan, dan nama file lampiran.
            </li>
            <li>
              <strong>Lampiran chat:</strong> isi gambar atau PDF yang Anda lampirkan hanya diproses untuk menjawab
              pertanyaan dan tidak disimpan. Yang dicatat hanya nama filenya.
            </li>
            <li>
              <strong>Dokumen referensi:</strong> dokumen yang diunggah admin untuk dijadikan bahan pencarian.
            </li>
            <li>
              <strong>Data sesi:</strong> token login yang disimpan di browser Anda agar tetap masuk.
            </li>
          </ul>

          <h2>2. Cara kami menggunakan data</h2>
          <ul>
            <li>Memverifikasi identitas Anda saat masuk dan mengatur hak akses sesuai peran.</li>
            <li>Menampilkan profil Anda di aplikasi.</li>
            <li>Menyimpan riwayat percakapan agar dapat Anda buka kembali.</li>
            <li>Mencari dokumen yang relevan dan menyusun jawaban atas pertanyaan Anda.</li>
            <li>Mengirim email yang berkaitan dengan akun, seperti konfirmasi pendaftaran dan atur ulang kata sandi.</li>
          </ul>
          <p>Data Anda tidak dijual dan tidak digunakan untuk iklan.</p>

          <h2>3. Pemrosesan oleh penyedia layanan pihak ketiga</h2>
          <p>
            Untuk menyusun jawaban, pertanyaan Anda, sebagian riwayat percakapan, cuplikan dokumen referensi yang
            relevan, serta isi lampiran dikirim ke penyedia layanan berikut:
          </p>
          <ul>
            <li>
              <strong>OpenRouter</strong> (openrouter.ai): penyedia akses model bahasa AI yang meneruskan permintaan
              ke penyedia model (misalnya Google Gemini) untuk menghasilkan jawaban dan membaca isi gambar atau
              dokumen hasil pindaian.
            </li>
            <li>
              <strong>Jina AI</strong> (jina.ai): untuk mengubah teks menjadi representasi pencarian (embedding) dan
              mengurutkan dokumen berdasarkan relevansi.
            </li>
            <li>
              <strong>Google</strong>: hanya untuk proses masuk dengan akun Google.
            </li>
          </ul>
          <p>
            <strong>
              Mohon tidak memasukkan data identitas pasien atau informasi rahasia yang tidak diperlukan ke dalam
              pertanyaan maupun lampiran.
            </strong>
          </p>

          <h2>4. Penyimpanan dan keamanan</h2>
          <ul>
            <li>Data akun, riwayat percakapan, dan dokumen referensi disimpan di server milik RSCM.</li>
            <li>Kata sandi disimpan dalam bentuk terenkripsi satu arah (hash), bukan teks asli.</li>
            <li>Koneksi ke AKSARA dienkripsi menggunakan HTTPS.</li>
            <li>Akses ke data dibatasi sesuai peran; hanya admin yang dapat mengelola dokumen dan pengguna.</li>
          </ul>

          <h2>5. Lama penyimpanan</h2>
          <ul>
            <li>Riwayat percakapan disimpan sampai Anda menghapusnya. Menghapus percakapan juga menghapus seluruh pesan di dalamnya.</li>
            <li>Data akun disimpan selama akun Anda aktif. Saat akun dihapus, profil dan seluruh riwayat percakapan Anda ikut terhapus.</li>
          </ul>

          <h2>6. Hak dan pilihan Anda</h2>
          <ul>
            <li>Melihat dan memperbarui nama, username, dan nomor telepon melalui menu <em>Pengaturan profil</em>.</li>
            <li>Menghapus percakapan kapan saja dari daftar riwayat.</li>
            <li>Meminta penghapusan akun kepada pengelola AKSARA.</li>
            <li>
              Mencabut akses AKSARA ke akun Google Anda melalui{' '}
              <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">
                myaccount.google.com/permissions
              </a>
              .
            </li>
          </ul>

          <h2>7. Perubahan kebijakan</h2>
          <p>
            Kebijakan ini dapat diperbarui sewaktu-waktu. Tanggal pembaruan terakhir tercantum di bagian atas
            halaman ini.
          </p>

          <h2>8. Kontak</h2>
          <p>
            Pertanyaan mengenai kebijakan ini atau permintaan terkait data Anda dapat disampaikan kepada pengelola
            AKSARA di unit Teknologi Informasi RSCM
            {CONTACT_EMAIL ? (
              <>
                {' '}melalui <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              </>
            ) : null}
            .
          </p>
        </article>
      </main>
    </div>
  );
}
