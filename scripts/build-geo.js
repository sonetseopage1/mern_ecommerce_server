// Builds server/src/data/bd-geo.json  (divisions, districts, upazilas/thanas of Bangladesh, English + Bangla)
//   node scripts/build-geo.js
// Source: github.com/nuhil/bangladesh-geocode (8 divisions, 64 districts, 492 upazilas) + city-corporation thanas of Dhaka & Chattogram.
const fs = require('fs');
const path = require('path');

const BASE = 'https://raw.githubusercontent.com/nuhil/bangladesh-geocode/master';
const rows = async (file) => {
  const r = await fetch(`${BASE}/${file}`);
  if (!r.ok) throw new Error(`${file}: HTTP ${r.status}`);
  return (await r.json()).find((x) => x.type === 'table').data;
};

// Metropolitan police thanas (not part of the upazila list)
const METRO = {
  Dhaka: [
    ['Adabor', 'আদাবর'], ['Badda', 'বাড্ডা'], ['Banani', 'বনানী'], ['Bangshal', 'বংশাল'], ['Bimanbandar', 'বিমানবন্দর'], ['Cantonment', 'ক্যান্টনমেন্ট'],
    ['Chawkbazar', 'চকবাজার'], ['Dakshinkhan', 'দক্ষিণখান'], ['Darus Salam', 'দারুস সালাম'], ['Demra', 'ডেমরা'], ['Dhanmondi', 'ধানমন্ডি'], ['Gendaria', 'গেন্ডারিয়া'],
    ['Gulshan', 'গুলশান'], ['Hazaribagh', 'হাজারীবাগ'], ['Jatrabari', 'যাত্রাবাড়ী'], ['Kadamtali', 'কদমতলী'], ['Kafrul', 'কাফরুল'], ['Kalabagan', 'কলাবাগান'],
    ['Kamrangirchar', 'কামরাঙ্গীরচর'], ['Khilgaon', 'খিলগাঁও'], ['Khilkhet', 'খিলক্ষেত'], ['Kotwali (Dhaka)', 'কোতোয়ালি'], ['Lalbagh', 'লালবাগ'], ['Mirpur', 'মিরপুর'],
    ['Mohammadpur', 'মোহাম্মদপুর'], ['Motijheel', 'মতিঝিল'], ['New Market', 'নিউ মার্কেট'], ['Pallabi', 'পল্লবী'], ['Paltan', 'পল্টন'], ['Ramna', 'রমনা'],
    ['Rampura', 'রামপুরা'], ['Sabujbagh', 'সবুজবাগ'], ['Shahbagh', 'শাহবাগ'], ['Shah Ali', 'শাহ আলী'], ['Shahjahanpur', 'শাহজাহানপুর'], ['Sher-e-Bangla Nagar', 'শেরেবাংলা নগর'],
    ['Shyampur', 'শ্যামপুর'], ['Sutrapur', 'সূত্রাপুর'], ['Tejgaon', 'তেজগাঁও'], ['Tejgaon Industrial Area', 'তেজগাঁও শিল্পাঞ্চল'], ['Turag', 'তুরাগ'],
    ['Uttara Paschim', 'উত্তরা পশ্চিম'], ['Uttara Purba', 'উত্তরা পূর্ব'], ['Uttar Khan', 'উত্তরখান'], ['Vatara', 'ভাটারা'], ['Wari', 'ওয়ারী'], ['Hatirjheel', 'হাতিরঝিল'],
  ],
  Chattogram: [
    ['Kotwali (Chattogram)', 'কোতোয়ালী'], ['Panchlaish', 'পাঁচলাইশ'], ['Pahartali', 'পাহাড়তলী'], ['Chandgaon', 'চান্দগাঁও'], ['Double Mooring', 'ডবলমুরিং'],
    ['Bayazid', 'বায়েজিদ'], ['Khulshi', 'খুলশী'], ['Halishahar', 'হালিশহর'], ['Bakalia', 'বাকলিয়া'], ['Patenga', 'পতেঙ্গা'], ['Chawkbazar (Chattogram)', 'চকবাজার'],
    ['Akbar Shah', 'আকবর শাহ'], ['Bandar', 'বন্দর'], ['EPZ', 'ইপিজেড'], ['Sadarghat', 'সদরঘাট'], ['Kattali', 'কাট্টলী'],
  ],
};

(async () => {
  const [div, dis, upa] = await Promise.all([rows('divisions/divisions.json'), rows('districts/districts.json'), rows('upazilas/upazilas.json')]);
  const fix = (n) => ({ Chattagram: 'Chattogram', Barisal: 'Barishal' }[n] || n);
  const divisions = div.map((d) => ({ id: d.id, name: fix(d.name), bn: d.bn_name }));
  const districts = dis.map((d) => ({ id: d.id, divisionId: d.division_id, name: fix(d.name), bn: d.bn_name }));
  const upazilas = upa.map((u) => ({ id: u.id, districtId: u.district_id, name: u.name, bn: u.bn_name, kind: 'upazila' }));

  for (const [districtName, list] of Object.entries(METRO)) {
    const d = districts.find((x) => x.name.toLowerCase() === districtName.toLowerCase());
    if (!d) throw new Error('district not found: ' + districtName);
    list.forEach(([name, bn], i) => upazilas.push({ id: `m${d.id}-${i + 1}`, districtId: d.id, name, bn, kind: 'thana' }));
  }
  const out = path.join(__dirname, '..', 'src', 'data', 'bd-geo.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ divisions, districts, upazilas }));
  console.log(`${divisions.length} divisions, ${districts.length} districts, ${upazilas.length} upazilas/thanas → ${out}`);
})().catch((e) => { console.error(e); process.exit(1); });
