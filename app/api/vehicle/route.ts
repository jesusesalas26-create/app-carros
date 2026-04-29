import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      mode,
      vin,
      manualModel,
      mileage,
      paidPrice,
      auctionFee,
      transport,
      repair,
      otherCost,
      condition,
      title,
      demand,
    } = body;

    const apiKey = process.env.MARKETCHECK_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Falta MARKETCHECK_API_KEY en .env.local" },
        { status: 500 }
      );
    }

    let vehicleData = {
      year: "",
      make: "",
      model: "",
    };

    if (vin) {
      const vinRes = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`
      );

      const vinJson = await vinRes.json();
      const results = vinJson.Results;

      vehicleData.year =
        results.find((r: any) => r.Variable === "Model Year")?.Value || "";

      vehicleData.make =
        results.find((r: any) => r.Variable === "Make")?.Value || "";

      vehicleData.model =
        results.find((r: any) => r.Variable === "Model")?.Value || "";
    }

    let avgMarketPrice = 0;
    let minPrice = 0;
    let maxPrice = 0;
    let listingsFound = 0;

    const marketUrl = new URL(
      "https://api.marketcheck.com/v2/predict/car/us/marketcheck_price"
    );

    marketUrl.searchParams.set("api_key", apiKey);
    marketUrl.searchParams.set("vin", vin);
    marketUrl.searchParams.set("miles", mileage || "120000");
    marketUrl.searchParams.set("dealer_type", "independent");
    marketUrl.searchParams.set("zip", "75201");

    const marketRes = await fetch(marketUrl.toString(), {
      headers: {
        Accept: "application/json",
      },
    });

    const marketJson = await marketRes.json();

    console.log("MARKETCHECK RESPONSE:", marketJson);

    if (marketJson?.predicted_price) {
      avgMarketPrice = Number(marketJson.predicted_price);
    } else if (marketJson?.price) {
      avgMarketPrice = Number(marketJson.price);
    } else if (marketJson?.marketcheck_price) {
      avgMarketPrice = Number(marketJson.marketcheck_price);
    } else if (marketJson?.data?.predicted_price) {
      avgMarketPrice = Number(marketJson.data.predicted_price);
    } else if (marketJson?.data?.price) {
      avgMarketPrice = Number(marketJson.data.price);
    }

    if (marketJson?.comparables?.length) {
      listingsFound = marketJson.comparables.length;
    } else if (marketJson?.data?.comparables?.length) {
      listingsFound = marketJson.data.comparables.length;
    }

    if (!avgMarketPrice || avgMarketPrice <= 0) {
      return NextResponse.json(
        {
          error:
            "MarketCheck respondió, pero no devolvió precio válido. Revisa consola.",
          marketCheckResponse: marketJson,
        },
        { status: 500 }
      );
    }

    avgMarketPrice = Math.round(avgMarketPrice);
    minPrice = Math.round(avgMarketPrice * 0.85);
    maxPrice = Math.round(avgMarketPrice * 1.15);

    let adjustment = 1;

    if (condition === "Mala") adjustment *= 0.75;
    if (condition === "Regular") adjustment *= 0.85;
    if (condition === "Buena") adjustment *= 0.95;
    if (condition === "Excelente") adjustment *= 1;

    if (title === "Salvage") adjustment *= 0.45;
    if (title === "Rebuilt") adjustment *= 0.65;
    if (title === "Clean") adjustment *= 1;

    if (demand === "Baja") adjustment *= 0.85;
    if (demand === "Media") adjustment *= 0.95;
    if (demand === "Alta") adjustment *= 1.05;

    const adjustedMarket = Math.round(avgMarketPrice * adjustment);

    const aggressiveOffer = Math.round(adjustedMarket * 0.45);
    const safeOffer = Math.round(adjustedMarket * 0.55);
    const maxRecommended = Math.round(adjustedMarket * 0.65);
    const dontPayMoreThan = Math.round(adjustedMarket * 0.7);

    // DEAL SCORE
    let dealScore = 100;

    if (condition === "Regular") dealScore -= 10;
    if (condition === "Mala") dealScore -= 25;

    if (title === "Rebuilt") dealScore -= 20;
    if (title === "Salvage") dealScore -= 40;

    if (demand === "Media") dealScore -= 10;
    if (demand === "Baja") dealScore -= 25;

    const milesNumber = Number(mileage || 120000);

    if (milesNumber >= 150000) dealScore -= 15;
    if (milesNumber >= 180000) dealScore -= 25;

    if (dealScore < 0) dealScore = 0;
    if (dealScore > 100) dealScore = 100;

    let decision = "COMPRAR";
    let risk = "Buen deal";
    let message = "Buen potencial si compras por debajo del máximo recomendado.";

    if (dealScore < 50) {
      decision = "NO COMPRAR";
      risk = "Alto riesgo";
      message =
        "Mucho riesgo por título, condición, millas o baja demanda. Solo comprar extremadamente barato.";
    } else if (dealScore < 70) {
      decision = "DUDOSO";
      risk = "Riesgo medio";
      message =
        "Puede servir, pero revisa reparación, título, millas y margen antes de comprar.";
    }

    // PROFIT MODO COMPRADO
    const buyPrice = Number(paidPrice) || 0;
    const realAuctionFee = Number(auctionFee) || 0;
    const realTransport = Number(transport) || 0;
    const realRepair = Number(repair) || 0;
    const realOtherCost = Number(otherCost) || 0;

    const totalInvestment =
      buyPrice + realAuctionFee + realTransport + realRepair + realOtherCost;

    const minProfit = minPrice - totalInvestment;
    const maxProfit = maxPrice - totalInvestment;

    const recommendedSalePrice = Math.round(
      minPrice + (maxPrice - minPrice) * 0.55
    );

    return NextResponse.json({
      vehicle: {
        vin,
        year: vehicleData.year,
        make: vehicleData.make,
        model: vehicleData.model || manualModel || "Modelo no detectado",
      },
      market: {
        avgMarketPrice,
        minPrice,
        maxPrice,
        listingsFound,
      },
      deal: {
        adjustedMarket,
        aggressiveOffer,
        safeOffer,
        maxRecommended,
        dontPayMoreThan,
        dealScore,
        decision,
        risk,
        message,
      },
      profit: {
        buyPrice,
        auctionFee: realAuctionFee,
        transport: realTransport,
        repair: realRepair,
        otherCost: realOtherCost,
        totalInvestment,
        minProfit,
        maxProfit,
        recommendedSalePrice,
      },
    });
  } catch (error: any) {
    console.log("API ERROR:", error);

    return NextResponse.json(
      { error: error.message || "Error interno en API" },
      { status: 500 }
    );
  }
}