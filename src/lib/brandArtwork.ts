/** Map CDN / stream hosts → brand domains for favicon lookup. */
export const STREAM_HOST_TO_BRAND: Record<string, string> = {
  'stream.live.vc.bbcmedia.co.uk': 'bbc.co.uk',
  'as-hls-ww-live.akamaized.net': 'bbc.co.uk',
  'npr-ice.streamguys1.com': 'npr.org',
  'npr-ice.streamguys1.com.': 'npr.org',
  'ice.somafm.com': 'somafm.com',
  'ice1.somafm.com': 'somafm.com',
  'ice2.somafm.com': 'somafm.com',
  'ice4.somafm.com': 'somafm.com',
  'ice6.somafm.com': 'somafm.com',
  'stream.revma.ihrhls.com': 'iheart.com',
  'playerservices.streamtheworld.com': 'audacy.com',
  'icecast.radiofrance.fr': 'radiofrance.fr',
  'direct.franceinter.fr': 'radiofrance.fr',
  'direct.franceinfo.fr': 'radiofrance.fr',
  'direct.fipradio.fr': 'radiofrance.fr',
  'stream-relay-geo.ntslive.co.uk': 'nts.live',
  'stream-mixtape-geo.ntslive.net': 'nts.live',
  'stream.rinse.fm': 'rinse.fm',
  'relay-a.media.ntslive.net': 'nts.live',
  'wfmu.org': 'wfmu.org',
  'stream.wfmu.org': 'wfmu.org',
  'kexp-mp3-128.streamguys1.com': 'kexp.org',
  'kexp-mp3a.streamguys1.com': 'kexp.org',
  'kexp.streamguys1.com': 'kexp.org',
  'stream.radioparadise.com': 'radioparadise.com',
  'icecast.omroep.nl': 'npo.nl',
  'icecast.vrt.be': 'vrt.be',
  'live-radio01.mediahubaustralia.com': 'abc.net.au',
  'live-radio02.mediahubaustralia.com': 'abc.net.au',
  'live-radio03.mediahubaustralia.com': 'abc.net.au',
  'streaming.radio.co': 'radio.co',
  'edge.live.mp3.mdn.newmedia.nacamar.net': 'deutschlandfunk.de',
  'st01.sslstream.dlf.de': 'deutschlandfunk.de',
  'd111.rndfnk.com': 'deutschlandfunk.de',
  'stream.radiofrance.fr': 'radiofrance.fr',
  'audiostream.rtl.be': 'rtl.be',
  'icecast.ofdoom.com': 'wfmu.org',
  'wnyc-ais.streamguys1.com': 'wnyc.org',
  'stream.wnyc.org': 'wnyc.org',
  'kcrw.streamguys1.com': 'kcrw.com',
  'streams.radiobob.de': 'radiobob.de',
  'stream.srg-ssr.ch': 'srgssr.ch',
  'lsaplus.swisstxt.ch': 'srgssr.ch',
  'radiofrance-streaming.media.radiofrance.fr': 'radiofrance.fr',
  'bbcmedia.streamguys.com': 'bbc.co.uk',
  'cbcradiolive.akamaized.net': 'cbc.ca',
  'playerservices.streamtheworld.com.': 'audacy.com',
  'sc03.canstream.co.uk': 'classicfm.com',
  'media-ice.musicradio.com': 'global.com',
  'stream.radiojar.com': 'radiojar.com',
};

/** Absolute logo URLs for stations that never resolve via favicon. */
export const LOGO_OVERRIDES: Record<string, string> = {
  '98adecf7-2683-4408-9be7-02d3f9098eb8':
    'https://cdn-profiles.tunein.com/s24940/images/logog.png',
  '961e6cac-0601-11e8-ae97-52543be04c81':
    'https://www.google.com/s2/favicons?domain=nts.live&sz=128',
  'ca0d4e4d-658b-43cc-abce-710075ae358d':
    'https://somafm.com/img/groovesalad120.png',
  'ae7aeb65-5a30-4848-8059-91b2bc2dcfd9':
    'https://somafm.com/img/dronezone120.png',
  '869aed72-cf94-4fb5-868e-a54321c51081':
    'https://www.radioparadise.com/graphics/logo_flat_512.png',
  '6a7508a9-27ab-11e8-91bf-52543be04c81':
    'https://www.kexp.org/static/assets/img/kexp_logo.png',
  '7ba4c184-fc2b-11e9-bbf2-52543be04c81':
    'https://media.npr.org/chrome_svg/npr-logo.svg',
};

export function brandHostForStreamUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (STREAM_HOST_TO_BRAND[host]) return STREAM_HOST_TO_BRAND[host];
    for (const [streamHost, brand] of Object.entries(STREAM_HOST_TO_BRAND)) {
      if (host === streamHost || host.endsWith('.' + streamHost) || streamHost.endsWith(host)) {
        return brand;
      }
      if (host.includes('bbc') && brand.includes('bbc')) return brand;
      if (host.includes('somafm') && brand.includes('somafm')) return 'somafm.com';
      if (host.includes('nts') && brand.includes('nts')) return 'nts.live';
      if (host.includes('kexp') && brand.includes('kexp')) return 'kexp.org';
      if (host.includes('radioparadise') || host.includes('radio-paradise')) return 'radioparadise.com';
      if (host.includes('radiofrance') || host.includes('franceinter') || host.includes('fipradio')) {
        return 'radiofrance.fr';
      }
      if (host.includes('npr') && brand.includes('npr')) return 'npr.org';
      if (host.includes('wfmu')) return 'wfmu.org';
      if (host.includes('rinse')) return 'rinse.fm';
      if (host.includes('mediahubaustralia') || host.includes('abc.net')) return 'abc.net.au';
      if (host.includes('omroep.nl') || host.includes('npo.nl')) return 'npo.nl';
    }
    return null;
  } catch {
    return null;
  }
}
