// Stable-value markets do not provide a meaningful crypto directional flip
// signal. This includes fiat-backed stablecoins and commodity-backed tokens.
// Keep the list explicit so a newly listed symbol cannot be excluded
// accidentally just because its name happens to contain "USD".
const STABLECOIN_ASSETS = new Set([
  "AEUR",
  "ALUSD",
  "AUDF",
  "AUDM",
  "BUSD",
  "BFUSD",
  "BRL1",
  "CRVUSD",
  "DAI",
  "DOLA",
  "EURS",
  "EURC",
  "EURT",
  "EURI",
  "FEI",
  "FDUSD",
  "FRAX",
  "GHO",
  "GUSD",
  "HUSD",
  "KAG",
  "KAU",
  "KGST",
  "LUSD",
  "MIM",
  "MUSD",
  "NUSD",
  "OUSD",
  "PYUSD",
  "RAI",
  "RLUSD",
  "PAXG",
  "SUSD",
  "TUSD",
  "U",
  "USDA",
  "USDC",
  "USDE",
  "USDJ",
  "USDK",
  "USDL",
  "USDM",
  "USDN",
  "USDP",
  "USDS",
  "USDT",
  "USD0",
  "USD1",
  "USDX",
  "USDD",
  "USDG",
  "UST",
  "USTC",
  "USAT",
  "VAI",
  "XUSD",
  "XAUT",
  "DGX",
]);

export function isStablecoinAsset(asset: string) {
  return STABLECOIN_ASSETS.has(asset.trim().toUpperCase());
}

export function isFlipEligibleBaseAsset(asset: string) {
  const normalizedAsset = asset.trim().toUpperCase();
  return !isStablecoinAsset(normalizedAsset) && !/(UP|DOWN|BULL|BEAR)$/.test(normalizedAsset);
}
