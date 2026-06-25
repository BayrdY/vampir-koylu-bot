# Discord Vampir Köylü (Mafia) Oyun Motoru 🦇

Selamlar! Discord sunucularında arkadaş ortamıyla dönen klasik Vampir-Köylü (veya Town of Salem / Mafia) konseptini otomatize etmek için yazdığım Discord botu altyapısını paylaşıyorum. 

Normalde bu oyunu sesli kanalda yönetmek, kimin kime saldırdığını akılda tutmak ve özel mesajlarla uğraşmak tam bir eziyet olabiliyor. Bu projeyi de tam olarak bu dertten kurtulmak, oyunu tamamen interaktif Discord arayüzleriyle (Embed mesajlar, menüler, otomatik kanal izinleri ve ses kontrolleri) pürüzsüz bir hale getirmek için geliştirdim.

## 🚀 Neler Yapabiliyor?

- **Tam Otomatik Gece/Gündüz Döngüsü:** Oyunu host eden kişi panel üzerinden gece ve gündüz evrelerini yönetiyor. Bot, gece olunca yaşayan herkesi otomatik susturur (server mute), sabah olunca tartışma için geri açar.
- **Dinamik Ses Kanalı Koruması:** Oyuna sonradan girenler veya ölüp de kanaldan çık-gir yapanlar anında bot tarafından yakalanır. Oyunu trollemesinler diye kalıcı olarak susturulup "Ölü" olarak işaretlenirler.
- **Rol Yetenekleri ve Çakışmalar:** 
  - Gözcü, Doktor, Vampir ve **Escort** rolleri aktif.
  - Altyapı, rollerin birbiriyle olan çakışmalarını arka planda hesaplıyor. Örneğin, Escort gece Doktoru oyalarsa, Doktor'un kalkanı kırılır ve Vampirler kurbanı öldürebilir.
- **Özel Vampir Konseyi (Sığınağı):** Vampir olan oyuncular için sadece onların görebildiği özel bir metin kanalı tahsis edilir. Vampirler kimi kurban seçeceklerini birbirleriyle menü üzerinden oylayarak "Ortaya atılan kurban" mekaniği sayesinde hızlıca kararlaştırırlar.

## ⚙️ Kurulum & Başlangıç

1. Bilgisayarınızda veya sunucunuzda [Node.js](https://nodejs.org/)'in kurulu olduğundan emin olun.
2. Projeyi indirin veya klonlayın.
3. Proje dizininde terminali açıp gerekli kütüphaneyi kurun:
   ```bash
   npm install discord.js
   ```
4. `config.json` dosyasını kendi Discord sunucunuza göre doldurun:
   ```json
   {
       "token": "BOTUNUZUN_TOKEN_KODU",
       "voiceChannelId": "OYUNUN_OYNANACAGI_SES_KANALI_ID",
       "controlChannelId": "HOST_PANELININ_DUSCEGI_KANAL_ID",
       "vampireChannelId": "VAMPIRLERIN_GIZLI_KANAL_ID"
   }
   ```
   *(Not: Botun sunucunuzda üyeleri susturabilmesi ve kanal yetkilerini düzenleyebilmesi için gerekli yönetici yetkilerine sahip olduğundan emin olun.)*
5. Botu başlatın:
   ```bash
   node index.js
   ```

## 🎮 Nasıl Oynanır?

Bot çalıştıktan sonra `controlChannelId` olarak belirlediğiniz kanala bir kontrol paneli düşer. 
Oyuncular ses kanalına toplandıktan sonra oyunculardan biri paneldeki **Host Ol** butonuna tıklayarak yönetici yetkisini alır. Host panel üzerinden oyundaki vampir, doktor ve escort sayılarını belirler ve oyunu başlatır. Atanmayan kişiler otomatik olarak "Köylü" sayılır. Oyun başladıktan sonra gerisi tamamen botun yönlendirmeleri, DM bildirimleri ve panel üzerindeki butonlarla akıp gider.

## 🤝 Düzenleme & Geliştirme

Proje (MIT Lisansı ile) açık kaynaklıdır. İstediğiniz gibi çatallayabilir (fork), kendi sunucunuza özel yeni roller (Örn: Jester, Seri Katil) veya yeni kurallar ekleyebilirsiniz. Altyapıyı bir "State Machine" yapısında (`LOBBY` -> `ROLE_SELECTION` -> `NIGHT` -> `DAY` -> `VOTING`) tuttuğum için aralara yeni fazlar veya mekanikler eklemek oldukça rahattır.

Keyifli oyunlar!
