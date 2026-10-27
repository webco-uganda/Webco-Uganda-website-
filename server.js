
const express = require("express");
const session = require("express-session");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || "CHANGE-ME-IN-PRODUCTION";
const db = new Database(path.join(__dirname, "webco.db"));
db.pragma("foreign_keys = ON");
db.exec(require("fs").readFileSync(path.join(__dirname, "schema.sql"), "utf8"));

app.use(helmet({contentSecurityPolicy:false}));
app.use(morgan("tiny"));
app.use(express.json({limit:"2mb"}));
app.use(express.urlencoded({extended:true}));
app.use(session({
  secret: SESSION_SECRET,
  resave:false,
  saveUninitialized:false,
  cookie:{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:1000*60*60*8}
}));
app.use(express.static(path.join(__dirname,"public")));

const q = {
  adminCount: db.prepare("SELECT COUNT(*) c FROM admins"),
  addAdmin: db.prepare("INSERT INTO admins(email,password_hash,name) VALUES(?,?,?)"),
  adminByEmail: db.prepare("SELECT * FROM admins WHERE email=?"),
  memberByEmail: db.prepare("SELECT * FROM members WHERE email=?"),
  addMember: db.prepare("INSERT INTO members(membership_no,full_name,email,phone,district,category,status,password_hash) VALUES(?,?,?,?,?,?,?,?)"),
  members: db.prepare("SELECT id,membership_no,full_name,email,phone,district,category,status,created_at FROM members ORDER BY id DESC"),
  projects: db.prepare("SELECT * FROM projects ORDER BY id DESC"),
  addProject: db.prepare("INSERT INTO projects(name,programme,district,beneficiaries,start_date,end_date,status,description,budget) VALUES(?,?,?,?,?,?,?,?,?)"),
  events: db.prepare("SELECT * FROM events ORDER BY date ASC"),
  news: db.prepare("SELECT * FROM news ORDER BY published_at DESC, id DESC"),
  addVolunteer: db.prepare("INSERT INTO volunteer_applications(full_name,phone,email,district,skills,availability,reason) VALUES(?,?,?,?,?,?,?)"),
  addContact: db.prepare("INSERT INTO contact_messages(name,email,phone,subject,message) VALUES(?,?,?,?,?)"),
  donations: db.prepare("SELECT * FROM donations ORDER BY id DESC"),
  addDonation: db.prepare("INSERT INTO donations(donor_name,email,phone,amount,currency,purpose,status,provider,reference) VALUES(?,?,?,?,?,?,?,?,?)"),
  addPayment: db.prepare("INSERT INTO payments(member_id,amount,currency,purpose,provider,reference,status) VALUES(?,?,?,?,?,?,?)"),
  log: db.prepare("INSERT INTO audit_log(admin_id,action,entity,entity_id) VALUES(?,?,?,?)")
};

function auth(req,res,next){ if(!req.session.admin) return res.status(401).json({error:"Admin login required"}); next(); }
function memberAuth(req,res,next){ if(!req.session.member) return res.status(401).json({error:"Member login required"}); next(); }
function safeText(v,max=2000){return String(v??"").trim().slice(0,max)}
function membershipNo(){return "WEBCO-"+new Date().getFullYear()+"-"+crypto.randomBytes(3).toString("hex").toUpperCase()}
function ref(prefix){return prefix+"-"+Date.now()+"-"+crypto.randomBytes(3).toString("hex").toUpperCase()}

app.get("/api/status",(req,res)=>res.json({
  setupRequired:q.adminCount.get().c===0,
  admin:!!req.session.admin,
  member:!!req.session.member
}));

app.post("/api/setup", async (req,res)=>{
  if(q.adminCount.get().c>0) return res.status(409).json({error:"Initial setup already completed"});
  const name=safeText(req.body.name,100), email=safeText(req.body.email,160).toLowerCase(), password=String(req.body.password||"");
  if(!name||!email||password.length<10) return res.status(400).json({error:"Name, valid email and password of at least 10 characters are required"});
  const hash=await bcrypt.hash(password,12);
  const info=q.addAdmin.run(email,hash,name);
  req.session.admin={id:info.lastInsertRowid,email,name};
  res.json({ok:true});
});

app.post("/api/admin/login",async(req,res)=>{
  const a=q.adminByEmail.get(safeText(req.body.email,160).toLowerCase());
  if(!a || !(await bcrypt.compare(String(req.body.password||""),a.password_hash))) return res.status(401).json({error:"Invalid credentials"});
  req.session.admin={id:a.id,email:a.email,name:a.name};
  res.json({ok:true});
});
app.post("/api/admin/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));

app.post("/api/members/register",async(req,res)=>{
  const full=safeText(req.body.full_name,150),email=safeText(req.body.email,160).toLowerCase();
  if(!full||!email) return res.status(400).json({error:"Full name and email are required"});
  if(q.memberByEmail.get(email)) return res.status(409).json({error:"A member with this email already exists"});
  const no=membershipNo(), category=safeText(req.body.category,80)||"Ordinary Member";
  const password=String(req.body.password||"");
  if(password.length<10) return res.status(400).json({error:"Choose a password of at least 10 characters"});
  const hash=await bcrypt.hash(password,12);
  q.addMember.run(no,full,email,safeText(req.body.phone,50),safeText(req.body.district,100),category,"pending",hash);
  res.json({ok:true,membership_no:no,message:"Application received. Save your membership number; your account can be used while your membership status is pending."});
});

app.post("/api/members/login",async(req,res)=>{
  const m=q.memberByEmail.get(safeText(req.body.email,160).toLowerCase());
  if(!m || !m.password_hash || !(await bcrypt.compare(String(req.body.password||""),m.password_hash))) return res.status(401).json({error:"Invalid credentials"});
  req.session.member={id:m.id,email:m.email,membership_no:m.membership_no};
  res.json({ok:true});
});
app.post("/api/members/logout",(req,res)=>{req.session.member=null;res.json({ok:true})});
app.get("/api/members/me",memberAuth,(req,res)=>{
  const m=db.prepare("SELECT id,membership_no,full_name,email,phone,district,category,status,created_at FROM members WHERE id=?").get(req.session.member.id);
  res.json(m);
});

app.get("/api/public/projects",(req,res)=>res.json(q.projects.all()));
app.get("/api/public/events",(req,res)=>res.json(q.events.all()));
app.get("/api/public/news",(req,res)=>res.json(q.news.all()));

app.post("/api/volunteers",(req,res)=>{
  const b=req.body;
  if(!safeText(b.full_name,150)) return res.status(400).json({error:"Name is required"});
  q.addVolunteer.run(safeText(b.full_name,150),safeText(b.phone,50),safeText(b.email,160),safeText(b.district,100),safeText(b.skills,500),safeText(b.availability,80),safeText(b.reason,2000));
  res.json({ok:true,message:"Volunteer application received."});
});
app.post("/api/contact",(req,res)=>{
  const b=req.body;
  if(!safeText(b.name,150)||!safeText(b.message,3000)) return res.status(400).json({error:"Name and message are required"});
  q.addContact.run(safeText(b.name,150),safeText(b.email,160),safeText(b.phone,50),safeText(b.subject,200),safeText(b.message,3000));
  res.json({ok:true,message:"Message received."});
});

/* Phase 4: payment records. Real gateway credentials are deliberately not embedded. */
app.post("/api/donations",(req,res)=>{
  const amount=Number(req.body.amount);
  if(!Number.isFinite(amount)||amount<=0) return res.status(400).json({error:"Enter a valid amount"});
  const reference=ref("DON");
  q.addDonation.run(safeText(req.body.donor_name,150),safeText(req.body.email,160),safeText(req.body.phone,50),amount,safeText(req.body.currency,8)||"UGX",safeText(req.body.purpose,200),"pending",safeText(req.body.provider,50)||"gateway-not-configured",reference);
  res.json({ok:true,reference,status:"pending",message:"Donation recorded as pending. Connect a payment provider in Phase 4 production configuration to collect funds."});
});
app.post("/api/member-payments",memberAuth,(req,res)=>{
  const amount=Number(req.body.amount);
  if(!Number.isFinite(amount)||amount<=0) return res.status(400).json({error:"Enter a valid amount"});
  const reference=ref("PAY");
  q.addPayment.run(req.session.member.id,amount,safeText(req.body.currency,8)||"UGX",safeText(req.body.purpose,100)||"membership","gateway-not-configured",reference,"pending");
  res.json({ok:true,reference,status:"pending"});
});

/* Admin */
app.get("/api/admin/members",auth,(req,res)=>res.json(q.members.all()));
app.get("/api/admin/projects",auth,(req,res)=>res.json(q.projects.all()));
app.get("/api/admin/donations",auth,(req,res)=>res.json(q.donations.all()));
app.get("/api/admin/volunteers",auth,(req,res)=>res.json(db.prepare("SELECT * FROM volunteer_applications ORDER BY id DESC").all()));
app.get("/api/admin/messages",auth,(req,res)=>res.json(db.prepare("SELECT * FROM contact_messages ORDER BY id DESC").all()));

app.post("/api/admin/projects",auth,(req,res)=>{
  const b=req.body;
  if(!safeText(b.name,200)) return res.status(400).json({error:"Project name is required"});
  const info=q.addProject.run(safeText(b.name,200),safeText(b.programme,120),safeText(b.district,120),safeText(b.beneficiaries,200),safeText(b.start_date,30),safeText(b.end_date,30),safeText(b.status,40)||"planned",safeText(b.description,3000),Number(b.budget)||0);
  q.log.run(req.session.admin.id,"create","project",info.lastInsertRowid);
  res.json({ok:true,id:info.lastInsertRowid});
});
app.post("/api/admin/events",auth,(req,res)=>{
  const b=req.body; if(!safeText(b.name,200)) return res.status(400).json({error:"Event name is required"});
  const info=db.prepare("INSERT INTO events(name,date,time,location,description,registration_url) VALUES(?,?,?,?,?,?)").run(safeText(b.name,200),safeText(b.date,30),safeText(b.time,30),safeText(b.location,200),safeText(b.description,2000),safeText(b.registration_url,500));
  q.log.run(req.session.admin.id,"create","event",info.lastInsertRowid); res.json({ok:true,id:info.lastInsertRowid});
});
app.post("/api/admin/news",auth,(req,res)=>{
  const b=req.body; if(!safeText(b.title,250)||!safeText(b.body,5000)) return res.status(400).json({error:"Title and article body are required"});
  const info=db.prepare("INSERT INTO news(title,body,location,programme,published_at) VALUES(?,?,?,?,?)").run(safeText(b.title,250),safeText(b.body,5000),safeText(b.location,150),safeText(b.programme,120),safeText(b.published_at,30)||new Date().toISOString().slice(0,10));
  q.log.run(req.session.admin.id,"create","news",info.lastInsertRowid); res.json({ok:true,id:info.lastInsertRowid});
});
app.patch("/api/admin/members/:id/status",auth,(req,res)=>{
  const status=safeText(req.body.status,30);
  if(!["pending","active","suspended","rejected"].includes(status)) return res.status(400).json({error:"Invalid status"});
  db.prepare("UPDATE members SET status=? WHERE id=?").run(status,Number(req.params.id));
  q.log.run(req.session.admin.id,"status","member",Number(req.params.id)); res.json({ok:true});
});
app.patch("/api/admin/donations/:id/status",auth,(req,res)=>{
  const status=safeText(req.body.status,30);
  if(!["pending","paid","failed","refunded"].includes(status)) return res.status(400).json({error:"Invalid status"});
  db.prepare("UPDATE donations SET status=? WHERE id=?").run(status,Number(req.params.id)); res.json({ok:true});
});

app.get("/api/admin/stats",auth,(req,res)=>res.json({
  members:db.prepare("SELECT COUNT(*) c FROM members").get().c,
  activeMembers:db.prepare("SELECT COUNT(*) c FROM members WHERE status='active'").get().c,
  projects:db.prepare("SELECT COUNT(*) c FROM projects").get().c,
  volunteers:db.prepare("SELECT COUNT(*) c FROM volunteer_applications").get().c,
  messages:db.prepare("SELECT COUNT(*) c FROM contact_messages WHERE status='new'").get().c,
  donations:db.prepare("SELECT COALESCE(SUM(amount),0) total FROM donations WHERE status='paid'").get().total
}));

app.get("/admin",(req,res)=>res.sendFile(path.join(__dirname,"public","admin.html")));
app.get("/member",(req,res)=>res.sendFile(path.join(__dirname,"public","member.html")));

app.listen(PORT,()=>console.log(`WEBCO platform running on http://localhost:${PORT}`));
