/* script.js - Perpustakaan LocalStorage
   Fitur lengkap: multi-role, multi-kelas, pengajuan, approve, edit tanggal (admin),
   denda per hari, export/import, laporan filter, auto-save.
*/

// ------------ STORAGE KEYS ------------
const KEY = {
  users: 'lib_users_v3',
  books: 'lib_books_v3',
  requests: 'lib_requests_v3',
  loans: 'lib_loans_v3',
  settings: 'lib_settings_v3',
  cur: 'lib_cur_v3'
};

// ------------ SAMPLE DATA ------------
const SAMPLE_USERS = [
  // Admin
  { id:'A001', username:'A001', password:'admin1', role:'admin', nama:'Diky Hernawan' },
  // Petugas
  { id:'P001', username:'P001', password:'Petugas1', role:'petugas', nama:'Angga Buana' },
  // Siswa (multi kelas + telp)
  { id:'S001', username:'S001', password:'Daci1', role:'siswa', nama:'Diky', kelas:'X RPL A', telp:'0987' },
  { id:'S002', username:'S002', password:'Daci2', role:'siswa', nama:'Angga', kelas:'XI TKJ B', telp:'09877' }
];
const SAMPLE_BOOKS = [
  { id:'B001', title:'Matematika Dasar', author:'Andi Wijaya', stock:2 },
  { id:'B002', title:'Bahasa Indonesia', author:'Siti Nur', stock:1 },
  { id:'B003', title:'Fisika SMA', author:'Bambang', stock:3 }
];
const SAMPLE_SETTINGS = { finePerDay:1000, defaultDays:7 };

// ------------ helpers: storage ------------
function load(key, fallback){ const r = localStorage.getItem(key); if(!r) return fallback; try{return JSON.parse(r);}catch{return fallback;} }
function save(key, data){ localStorage.setItem(key, JSON.stringify(data)); }

// init
if(!localStorage.getItem(KEY.users)) save(KEY.users, SAMPLE_USERS);
if(!localStorage.getItem(KEY.books)) save(KEY.books, SAMPLE_BOOKS);
if(!localStorage.getItem(KEY.requests)) save(KEY.requests, []);
if(!localStorage.getItem(KEY.loans)) save(KEY.loans, []);
if(!localStorage.getItem(KEY.settings)) save(KEY.settings, SAMPLE_SETTINGS);

// ------------ APP STATE ------------
const App = {
  users: load(KEY.users, []),
  books: load(KEY.books, []),
  requests: load(KEY.requests, []),
  loans: load(KEY.loans, []),
  settings: load(KEY.settings, SAMPLE_SETTINGS),
  cur: load(KEY.cur, null),

  login(){
    const u = document.getElementById('inUser').value.trim();
    const p = document.getElementById('inPass').value;
    const user = this.users.find(x => x.username === u);
    if(!user){ return alert('Username tidak terdaftar'); }
    if(user.password !== p){ return alert('Password salah'); }
    this.cur = user;
    save(KEY.cur, user);
    UI.enter();
  },

  logout(){ this.cur = null; localStorage.removeItem(KEY.cur); UI.showLogin(); },

  resetSample(){
    if(!confirm('Reset semua data ke sample?')) return;
    save(KEY.users, SAMPLE_USERS);
    save(KEY.books, SAMPLE_BOOKS);
    save(KEY.requests, []);
    save(KEY.loans, []);
    save(KEY.settings, SAMPLE_SETTINGS);
    // reload app
    location.reload();
  },

  // ---------- BOOKS ----------
  saveBook(){
    const id = document.getElementById('bId').value.trim();
    const title = document.getElementById('bTitle').value.trim();
    const author = document.getElementById('bAuthor').value.trim();
    const stock = parseInt(document.getElementById('bStock').value,10);
    if(!title || !author || isNaN(stock) || stock < 0) return alert('Lengkapi data buku dengan benar');
    if(id){
      const b = this.books.find(x=>x.id===id);
      if(b){ b.title=title; b.author=author; b.stock=stock; }
    } else {
      const last = this.books.length ? parseInt(this.books[this.books.length-1].id.slice(1))+1 : 1;
      const newId = 'B' + String(last).padStart(3,'0');
      this.books.push({ id:newId, title, author, stock });
    }
    save(KEY.books, this.books);
    UI.clearBookForm(); UI.renderBooks();
    alert('Buku tersimpan');
  },

  deleteBook(bookId){
    if(!confirm('Hapus buku ini?')) return;
    this.books = this.books.filter(b=>b.id!==bookId);
    save(KEY.books, this.books); UI.renderBooks();
  },

  // ---------- STUDENTS (admin) ----------
  addStudent(){
    const id = document.getElementById('sId').value.trim();
    const nama = document.getElementById('sName').value.trim();
    const grade = document.getElementById('sGrade').value;
    const major = document.getElementById('sMajor').value;
    const group = document.getElementById('sGroup').value.trim();
    const telp = document.getElementById('sPhone').value.trim();
    const username = document.getElementById('sUser').value.trim();
    const pass = document.getElementById('sPass').value || 'password';

    if(!id || !nama || !username) return alert('Isi minimal ID, nama, username');
    if(this.users.find(u=>u.username===username)) return alert('Username sudah ada');

    const kelas = `${grade} ${major} ${group}`;
    this.users.push({ id, username, password:pass, role:'siswa', nama, kelas, telp });
    save(KEY.users, this.users);
    UI.clearStudentForm(); UI.renderStudents();
    alert('Siswa ditambahkan');
  },

  deleteStudent(username){
    if(!confirm('Hapus siswa ini?')) return;
    this.users = this.users.filter(u=>u.username!==username);
    save(KEY.users, this.users);
    UI.renderStudents();
  },

  // ---------- REQUESTS (siswa) ----------
  submitRequest(){
    if(!this.cur || this.cur.role!=='siswa') return alert('Hanya siswa yang bisa mengajukan');
    const ident = document.getElementById('reqBook').value.trim();
    if(!ident) return alert('Masukkan ID atau judul buku');
    const book = this.books.find(b => b.id.toLowerCase()===ident.toLowerCase() || b.title.toLowerCase()===ident.toLowerCase());
    if(!book) return alert('Buku tidak ditemukan');
    const rId = 'R' + Date.now();
    const req = { id:rId, bookId:book.id, bookTitle:book.title, siswaId:this.cur.username, siswaNama:this.cur.nama, siswaKelas:this.cur.kelas, siswaTelp:this.cur.telp, note:document.getElementById('reqNote').value.trim(), status:'pending', createdAt:new Date().toISOString() };
    this.requests.push(req);
    save(KEY.requests, this.requests);
    UI.renderMyRequests(); alert('Pengajuan terkirim');
    document.getElementById('reqBook').value=''; document.getElementById('reqNote').value='';
  },

  approveRequest(reqId){
    const req = this.requests.find(r=>r.id===reqId);
    if(!req || req.status!=='pending') return;
    const book = this.books.find(b=>b.id===req.bookId);
    if(!book) return alert('Buku tidak ditemukan');
    if(book.stock < 1) return alert('Stok kosong, tidak bisa approve');

    // create loan
    const lId = 'L' + Date.now();
    const t0 = new Date();
    const due = new Date(); due.setDate(t0.getDate() + (this.settings.defaultDays || 7));
    const loan = { id:lId, bookId:book.id, bookTitle:book.title, siswaId:req.siswaId, siswaNama:req.siswaNama, siswaKelas:req.siswaKelas, siswaTelp:req.siswaTelp, assignedBy:this.cur.username, tanggal_pinjam:t0.toISOString().slice(0,10), tanggal_kembali:due.toISOString().slice(0,10) };
    this.loans.push(loan);
    save(KEY.loans, this.loans);

    // reduce stock
    book.stock = Math.max(0, book.stock - 1);
    save(KEY.books, this.books);

    // update request
    req.status = 'approved'; req.processedBy = this.cur.username; req.processedAt = new Date().toISOString();
    save(KEY.requests, this.requests);

    UI.renderRequests(); UI.renderBooks(); UI.renderMyRequests(); UI.renderLoans(); UI.renderMyLoans();
    alert('Pengajuan disetujui, pinjaman tercatat');
  },

  rejectRequest(reqId){
    const req = this.requests.find(r=>r.id===reqId);
    if(!req || req.status!=='pending') return;
    req.status='rejected'; req.processedBy=this.cur.username; req.processedAt=new Date().toISOString();
    save(KEY.requests, this.requests); UI.renderRequests(); UI.renderMyRequests(); alert('Pengajuan ditolak');
  },

  // ---------- RETURN & EDIT (admin/petugas) ----------
  returnLoan(loanId){
    const loan = this.loans.find(l=>l.id===loanId);
    if(!loan) return;
    const book = this.books.find(b=>b.id===loan.bookId);
    if(book){ book.stock += 1; save(KEY.books, this.books); }
    this.loans = this.loans.filter(l=>l.id!==loanId);
    save(KEY.loans, this.loans);
    UI.renderLoans(); UI.renderBooks(); UI.renderMyLoans();
    alert('Buku dikembalikan, stok diupdate');
  },

  // admin only: edit loan dates
  editLoanDates(loanId, newStart, newDue){
    if(!this.cur || this.cur.role!=='admin') return alert('Hanya admin yang boleh edit tanggal');
    const loan = this.loans.find(l=>l.id===loanId);
    if(!loan) return alert('Loan tidak ditemukan');
    loan.tanggal_pinjam = newStart;
    loan.tanggal_kembali = newDue;
    save(KEY.loans, this.loans);
    UI.renderLoans(); UI.renderMyLoans(); alert('Tanggal pinjaman diperbarui');
  },

  // settings
  saveSettings(){
    const d = parseInt(document.getElementById('finePerDay').value,10) || 0;
    const days = parseInt(document.getElementById('defaultDays').value,10) || 7;
    this.settings.finePerDay = d; this.settings.defaultDays = days;
    save(KEY.settings, this.settings);
    alert('Pengaturan disimpan');
  },

  // compute fine
  computeFine(dueDateStr){
    const per = this.settings.finePerDay || 0;
    const now = new Date(); const due = new Date(dueDateStr);
    if(now <= due) return 0;
    const diffDays = Math.floor((now - due)/(1000*60*60*24));
    return diffDays * per;
  },

  // export / import
  exportData(){
    const data = { users:this.users, books:this.books, requests:this.requests, loans:this.loans, settings:this.settings };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'perpus-data.json'; a.click(); URL.revokeObjectURL(url);
  },

  importData(ev){
    const file = ev.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try{
        const data = JSON.parse(e.target.result);
        if(data.users) save(KEY.users, data.users);
        if(data.books) save(KEY.books, data.books);
        if(data.requests) save(KEY.requests, data.requests);
        if(data.loans) save(KEY.loans, data.loans);
        if(data.settings) save(KEY.settings, data.settings);
        alert('Import selesai. Halaman akan direfresh.');
        location.reload();
      }catch(err){ alert('File tidak valid'); }
    };
    reader.readAsText(file);
  },

  // reports printing
  printBooksReport(){
    const cls = document.getElementById('reportClass').value;
    let rows = '';
    this.books.forEach(b=>{
      rows += `<tr><td>${b.id}</td><td>${b.title}</td><td>${b.author}</td><td>${b.stock}</td></tr>`;
    });
    const html = `<h2>Laporan Buku</h2><table border="1" cellpadding="6"><tr><th>ID</th><th>Judul</th><th>Penulis</th><th>Stok</th></tr>${rows}</table>`;
    const w = window.open('','_blank'); w.document.write(html); w.document.close(); w.print();
  },

  printLoansReport(){
    const cls = document.getElementById('reportClass').value;
    let rows='';
    this.loans.forEach(l=>{
      rows += `<tr><td>${l.id}</td><td>${l.bookTitle} (${l.bookId})</td><td>${l.siswaNama} (${l.siswaId})</td><td>${l.tanggal_pinjam}</td><td>${l.tanggal_kembali}</td></tr>`;
    });
    const html = `<h2>Laporan Pinjaman Aktif</h2><table border="1" cellpadding="6"><tr><th>ID Loan</th><th>Buku</th><th>Siswa</th><th>Pinjam</th><th>Kembali</th></tr>${rows}</table>`;
    const w = window.open('','_blank'); w.document.write(html); w.document.close(); w.print();
  }
};

// ------------ UI ------------
const UI = {
  enter(){
    document.getElementById('loginBox').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    const r = App.cur.role;
    document.getElementById('who').innerText = `${App.cur.nama} • ${r.toUpperCase()} (${App.cur.username})`;
    document.getElementById('dashAdmin').style.display = (r==='admin') ? 'block' : 'none';
    document.getElementById('dashPetugas').style.display = (r==='petugas') ? 'block' : 'none';
    document.getElementById('dashSiswa').style.display = (r==='siswa') ? 'block' : 'none';
    this.show('books'); this.setupClassFilters(); this.renderBooks(); this.renderStudents(); this.renderRequests(); this.renderLoans(); this.renderMyRequests(); this.renderMyLoans();
    // set settings inputs
    document.getElementById('finePerDay').value = App.settings.finePerDay || 0;
    document.getElementById('defaultDays').value = App.settings.defaultDays || 7;
  },
  show(section){
    // hide all
    const panels = ['sec-books','sec-students','sec-requests','sec-myRequests','sec-loans','sec-myLoans','sec-settings','sec-reports'];
    panels.forEach(id=>{ const el = document.getElementById(id); if(el) el.style.display='none'; });
    if(section==='books') document.getElementById('sec-books').style.display='block';
    if(section==='students') document.getElementById('sec-students').style.display='block';
    if(section==='requests') document.getElementById('sec-requests').style.display='block';
    if(section==='myRequests') document.getElementById('sec-myRequests').style.display='block';
    if(section==='loans') document.getElementById('sec-loans').style.display='block';
    if(section==='myLoans') document.getElementById('sec-myLoans').style.display='block';
    if(section==='settings') document.getElementById('sec-settings').style.display='block';
    if(section==='reports') document.getElementById('sec-reports').style.display='block';
    // render updates
    this.renderBooks(); this.renderStudents(); this.renderRequests(); this.setupClassFilters(); this.renderLoans(); this.renderMyRequests(); this.renderMyLoans();
  },
  back(){ this.show(App.cur.role==='siswa'?'':'' ); this.enter(); },
  showLogin(){ document.getElementById('loginBox').style.display='block'; document.getElementById('app').style.display='none'; },

  // BOOKS
  renderBooks(){
    const q = document.getElementById('qBooks') ? document.getElementById('qBooks').value.trim().toLowerCase() : '';
    const el = document.getElementById('booksList'); if(!el) return; el.innerHTML='';
    const list = App.books.filter(b => !q || b.id.toLowerCase().includes(q) || b.title.toLowerCase().includes(q));
    if(list.length===0){ el.innerHTML = '<p class="muted">Tidak ada buku.</p>'; return; }
    list.forEach(b=>{
      const loan = App.loans.find(l=>l.bookId===b.id);
      let status = `<span class="badge badge-available">Tersedia</span>`;
      if(b.stock<=0 && loan) status = `<span class="badge badge-borrowed">Dipinjam oleh ${loan.siswaNama} (${loan.siswaId})</span>`;
      else if(b.stock===1) status = `<span class="badge badge-available">Stok 1</span>`;
      let actions='';
      if(App.cur.role!=='siswa'){ actions += `<button onclick="UI.fillBook('${b.id}')">Edit</button> <button onclick="App.deleteBook('${b.id}')">Hapus</button>`; }
      if(App.cur.role==='siswa'){ actions += `<button onclick="document.getElementById('reqBook').value='${b.id}'; UI.show('myRequests')">Ajukan Pinjam</button>`; }
      el.innerHTML += `<p><b>${b.id}</b> — ${b.title} <small>by ${b.author}</small><br/>Stok: ${b.stock} ${status}<br/>${actions}</p>`;
    });
  },
  fillBook(id){
    const b = App.books.find(x=>x.id===id); if(!b) return;
    document.getElementById('bId').value=b.id; document.getElementById('bTitle').value=b.title; document.getElementById('bAuthor').value=b.author; document.getElementById('bStock').value=b.stock;
    this.show('books');
  },
  clearBookForm(){ document.getElementById('bId').value=''; document.getElementById('bTitle').value=''; document.getElementById('bAuthor').value=''; document.getElementById('bStock').value=''; },

  // STUDENTS
  setupClassFilters(){
    const set = new Set(App.users.filter(u=>u.role==='siswa').map(s=>s.kelas));
    const filter = document.getElementById('filterClass');
    const report = document.getElementById('reportClass');
    if(!filter || !report) return;
    filter.innerHTML = '<option value="">-- Semua Kelas --</option>';
    report.innerHTML = '<option value="">-- semua --</option>';
    set.forEach(k=>{
      filter.innerHTML += `<option value="${k}">${k}</option>`;
      report.innerHTML += `<option value="${k}">${k}</option>`;
    });
  },
  renderStudents(){
    const cls = document.getElementById('filterClass') ? document.getElementById('filterClass').value : '';
    const el = document.getElementById('studentsList'); if(!el) return; el.innerHTML='';
    const list = App.users.filter(u=>u.role==='siswa' && (!cls || u.kelas===cls));
    if(list.length===0) { el.innerHTML='<p class="muted">Tidak ada siswa.</p>'; return; }
    list.forEach(s=>{
      el.innerHTML += `<p><b>${s.nama}</b> (${s.username}) — ${s.kelas} • Telp: ${s.telp} <br/><small>Login: ${s.username} / ${s.password}</small> <br/> <button onclick="App.deleteStudent('${s.username}')">Hapus</button></p>`;
    });
  },

  clearStudentForm(){ document.getElementById('sId').value=''; document.getElementById('sName').value=''; document.getElementById('sGrade').value='X'; document.getElementById('sMajor').value='RPL'; document.getElementById('sGroup').value=''; document.getElementById('sPhone').value=''; document.getElementById('sUser').value=''; document.getElementById('sPass').value=''; },

  // REQUESTS (admin/petugas)
  renderRequests(){
    const el = document.getElementById('requestsList'); if(!el) return; el.innerHTML='';
    const pending = App.requests.filter(r=>r.status==='pending');
    if(pending.length===0){ el.innerHTML='<p class="muted">Tidak ada pengajuan.</p>'; return; }
    pending.forEach(r=>{
      el.innerHTML += `<p><b>${r.id}</b> — ${r.bookTitle} (${r.bookId})<br/>Siswa: ${r.siswaNama} (${r.siswaId}) • ${r.siswaKelas} • Telp: ${r.siswaTelp} <br/>Catatan: ${r.note || '-'} <br/><small>${new Date(r.createdAt).toLocaleString()}</small><br/><button onclick="App.approveRequest('${r.id}')">Setujui</button> <button onclick="App.rejectRequest('${r.id}')">Tolak</button></p>`;
    });
  },

  // MY REQUESTS (siswa)
  renderMyRequests(){
    const el = document.getElementById('myRequests'); if(!el) return; el.innerHTML='';
    const my = App.requests.filter(r=>r.siswaId===App.cur.username).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    if(my.length===0){ el.innerHTML='<p class="muted">Belum ada pengajuan.</p>'; return; }
    my.forEach(r=>{
      let info='';
      if(r.status==='approved') info = ` • disetujui oleh ${r.processedBy} pada ${new Date(r.processedAt).toLocaleString()}`;
      if(r.status==='rejected') info = ` • ditolak oleh ${r.processedBy} pada ${new Date(r.processedAt).toLocaleString()}`;
      el.innerHTML += `<p><b>${r.bookTitle}</b> (${r.bookId}) — <span class="badge badge-pending">${r.status.toUpperCase()}</span><br/>Diajukan: ${new Date(r.createdAt).toLocaleString()} ${info}</p>`;
    });
  },

  // LOANS
  renderLoans(){
    const el = document.getElementById('loansList'); if(!el) return; el.innerHTML='';
    if(App.loans.length===0){ el.innerHTML='<p class="muted">Belum ada pinjaman aktif.</p>'; return; }
    App.loans.forEach(l=>{
      const fine = App.computeFine(new Date(l.tanggal_kembali));
      el.innerHTML += `<p><b>${l.id}</b> — ${l.bookTitle} (${l.bookId})<br/>Siswa: ${l.siswaNama} (${l.siswaId}) • ${l.siswaKelas} • Telp: ${l.siswaTelp}<br/>Pinjam: ${l.tanggal_pinjam} — Kembali: ${l.tanggal_kembali} <br/>Denda hari ini: Rp ${App.computeFine(l.tanggal_kembali)}<br/><button onclick="App.returnLoan('${l.id}')">Tandai Dikembalikan</button> ${App.cur.role==='admin'? `<button onclick="UI.editLoanPrompt('${l.id}')">Edit Tanggal</button>` : ''}</p>`;
    });
  },

  renderMyLoans(){
    const el = document.getElementById('myLoansList'); if(!el) return; el.innerHTML='';
    const my = App.loans.filter(l=>l.siswaId===App.cur.username);
    if(my.length===0){ el.innerHTML='<p class="muted">Belum ada pinjaman aktif.</p>'; return; }
    my.forEach(l=>{
      el.innerHTML += `<p><b>${l.id}</b> — ${l.bookTitle} (${l.bookId})<br/>Pinjam: ${l.tanggal_pinjam} — Kembali: ${l.tanggal_kembali} <br/>Denda hari ini: Rp ${App.computeFine(l.tanggal_kembali)}</p>`;
    });
  },

  // edit loan dates prompt (admin)
  editLoanPrompt(loanId){
    const loan = App.loans.find(x=>x.id===loanId); if(!loan) return;
    const s = prompt('Tanggal pinjam (yyyy-mm-dd):', loan.tanggal_pinjam);
    if(!s) return;
    const d = prompt('Tanggal kembali (yyyy-mm-dd):', loan.tanggal_kembali);
    if(!d) return;
    App.editLoanDates(loanId, s, d);
  }
};

// expose App to window
window.App = App;
window.UI = UI;

// init on DOM ready
document.addEventListener('DOMContentLoaded', ()=>{
  // reload state
  App.users = load(KEY.users, SAMPLE_USERS);
  App.books = load(KEY.books, SAMPLE_BOOKS);
  App.requests = load(KEY.requests, []);
  App.loans = load(KEY.loans, []);
  App.settings = load(KEY.settings, SAMPLE_SETTINGS);
  App.cur = load(KEY.cur, null);
  // if logged in continue
  if(App.cur){ UI.enter(); } else { UI.showLogin(); }
});