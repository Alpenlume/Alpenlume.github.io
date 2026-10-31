/* Two hero messages, picked per page view; nothing is stored on the device.
   App Store links carry the variant, so App Analytics can compare them. */
(function () {
  var T = {
    home: {
      en: 'Buy it <em>once</em>. No subscription, no account.',
      de: 'Einmal <em>kaufen</em>. Kein Abo, kein Konto.',
      pl: 'Kupujesz <em>raz</em>. Bez subskrypcji, bez konta.',
      fr: 'Achetez <em>une fois</em>. Sans abonnement, sans compte.',
      it: 'Compri <em>una volta</em>. Niente abbonamento, niente account.',
      es: 'Compra <em>una vez</em>. Sin suscripción, sin cuenta.',
      ru: 'Покупка <em>один раз</em>. Без подписки, без аккаунта.',
      el: 'Αγοράστε <em>μία φορά</em>. Χωρίς συνδρομή, χωρίς λογαριασμό.',
      ja: '買うのは<em>一度だけ</em>。サブスクもアカウントも不要。',
      zh: '只需购买<em>一次</em>。无需订阅，无需账号。'
    },
    app: {
      en: 'One purchase. iPhone, iPad and Mac. <em>No subscription.</em>',
      de: 'Ein Kauf. iPhone, iPad und Mac. <em>Kein Abo.</em>',
      pl: 'Jeden zakup. iPhone, iPad i Mac. <em>Bez subskrypcji.</em>',
      fr: 'Un seul achat. iPhone, iPad et Mac. <em>Sans abonnement.</em>',
      it: 'Un solo acquisto. iPhone, iPad e Mac. <em>Nessun abbonamento.</em>',
      es: 'Una sola compra. iPhone, iPad y Mac. <em>Sin suscripción.</em>',
      ru: 'Одна покупка. iPhone, iPad и Mac. <em>Без подписки.</em>',
      el: 'Μία αγορά. iPhone, iPad και Mac. <em>Χωρίς συνδρομή.</em>',
      ja: '購入は一度。iPhone、iPad、Mac。<em>サブスクなし。</em>',
      zh: '一次购买。iPhone、iPad 和 Mac。<em>无需订阅。</em>'
    }
  };
  var page = document.currentScript.dataset.p, lang = document.documentElement.lang.slice(0, 2);
  var msgs = T[page], v = msgs ? (Math.random() < .5 ? 'a' : 'b') : '', h = document.querySelector('.hero h1');
  if (v === 'b' && h && msgs[lang]) h.innerHTML = msgs[lang];
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('a[href*="apps.apple.com/app/id"]').forEach(function (a) {
      var u = new URL(a.href);
      u.searchParams.set('pt', '129451595');
      u.searchParams.set('ct', 'site_' + page + (v ? '_' + v : ''));
      u.searchParams.set('mt', '8');
      a.href = u;
    });
  });
})();
