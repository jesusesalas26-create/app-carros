"use client";

import { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth, db } from "@/firebase";
import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  deleteDoc,
  updateDoc,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import VinScanner from "@/components/VinScanner";

const ADMIN_EMAIL = "jesusesalas26@gmail.com";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLogged, setIsLogged] = useState(false);
  const [mode, setMode] = useState<
    "admin" | "comprando" | "comprado" | "vendido" | null
  >(null);

  const [userPlan, setUserPlan] = useState("free");
  const [dailyUsage, setDailyUsage] = useState(0);
  const [remainingAnalyses, setRemainingAnalyses] = useState(2);

  const [vin, setVin] = useState("");
  const [manualModel, setManualModel] = useState("");
  const [mileage, setMileage] = useState("120000");

  const [paidPrice, setPaidPrice] = useState("");
  const [auctionFee, setAuctionFee] = useState("");
  const [transport, setTransport] = useState("");
  const [repair, setRepair] = useState("");
  const [otherCost, setOtherCost] = useState("");
  const [soldPrice, setSoldPrice] = useState("");

  const [condition, setCondition] = useState("Regular");
  const [title, setTitle] = useState("Clean");
  const [demand, setDemand] = useState("Media");

  const [carData, setCarData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedCar, setSelectedCar] = useState<any>(null);
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);

  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminSearch, setAdminSearch] = useState("");
  const [adminUid, setAdminUid] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  const isAdmin = auth.currentUser?.email === ADMIN_EMAIL;

  const labelClass = "block text-sm text-gray-400 mb-2 font-semibold";
  const fieldClass =
    "w-full p-4 mb-4 rounded bg-black border border-gray-700 text-white";

  const today = new Date().toISOString().split("T")[0];

  const toNumber = (value: any) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  const loadAdminUsers = async () => {
    if (!isAdmin) return;

    try {
      setAdminLoading(true);
      const snap = await getDocs(collection(db, "users"));
      setAdminUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error: any) {
      alert("Error cargando usuarios: " + error.message);
    } finally {
      setAdminLoading(false);
    }
  };

  const adminCreateUser = async () => {
    if (!isAdmin) return;

    if (!adminEmail || !adminPassword) {
      alert("Pon email y contraseña para crear el usuario");
      return;
    }

    if (adminPassword.length < 6) {
      alert("La contraseña debe tener mínimo 6 caracteres");
      return;
    }

    try {
      setAdminLoading(true);

      const apiKey = auth.app.options.apiKey;

      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: adminEmail,
            password: adminPassword,
            returnSecureToken: false,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.error?.message || "No se pudo crear el usuario");
        return;
      }

      const newUid = data.localId;

      await setDoc(doc(db, "users", newUid), {
        email: adminEmail,
        plan: "free",
        dailyUsage: 0,
        lastReset: today,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      alert("Usuario creado ✅");

      setAdminEmail("");
      setAdminPassword("");
      setAdminUid("");

      loadAdminUsers();
    } catch (error: any) {
      alert("Error creando usuario: " + error.message);
    } finally {
      setAdminLoading(false);
    }
  };

  const createOrUpdateUserByUid = async () => {
    if (!isAdmin) return;

    if (!adminUid || !adminEmail) {
      alert("Pon UID y email");
      return;
    }

    await setDoc(
      doc(db, "users", adminUid),
      {
        email: adminEmail,
        plan: "free",
        dailyUsage: 0,
        lastReset: today,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    alert("Usuario creado/actualizado en Firestore ✅");

    setAdminUid("");
    setAdminEmail("");
    loadAdminUsers();
  };

  const setUserPlanByUid = async (uid: string, plan: "free" | "pro") => {
    if (!isAdmin) return;
    if (!uid) {
      alert("Falta UID");
      return;
    }

    await setDoc(
      doc(db, "users", uid),
      {
        plan,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    alert(plan === "pro" ? "Usuario activado PRO ✅" : "Usuario cambiado a FREE");
    loadAdminUsers();
  };

  const resetUserUsage = async (uid: string) => {
    if (!isAdmin || !uid) return;

    await setDoc(
      doc(db, "users", uid),
      {
        dailyUsage: 0,
        lastReset: today,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    alert("Análisis reiniciados ✅");
    loadAdminUsers();
  };

  const loadUserPlan = async () => {
    if (!auth.currentUser) return;

    const userRef = doc(db, "users", auth.currentUser.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      await setDoc(userRef, {
        email: auth.currentUser.email,
        plan: "free",
        dailyUsage: 0,
        lastReset: today,
        createdAt: serverTimestamp(),
      });

      setUserPlan("free");
      setDailyUsage(0);
      setRemainingAnalyses(2);
      return;
    }

    const data = snap.data();
    let usage = data.dailyUsage || 0;

    if (data.lastReset !== today) {
      usage = 0;

      await setDoc(
        userRef,
        {
          dailyUsage: 0,
          lastReset: today,
        },
        { merge: true }
      );
    }

    setUserPlan(data.plan || "free");
    setDailyUsage(usage);
    setRemainingAnalyses(Math.max(2 - usage, 0));
  };

  const checkUsageLimit = async () => {
    if (!auth.currentUser) return false;

    const userRef = doc(db, "users", auth.currentUser.uid);
    const snap = await getDoc(userRef);

    let data: any = {
      plan: "free",
      dailyUsage: 0,
      lastReset: today,
    };

    if (!snap.exists()) {
      await setDoc(userRef, {
        email: auth.currentUser.email,
        ...data,
        createdAt: serverTimestamp(),
      });
    } else {
      data = snap.data();

      if (data.lastReset !== today) {
        data.dailyUsage = 0;
        data.lastReset = today;

        await setDoc(userRef, data, { merge: true });
      }
    }

    if (data.plan === "pro") {
      setUserPlan("pro");
      return true;
    }

    if ((data.dailyUsage || 0) >= 2) {
      alert(
        "🚫 Llegaste al límite gratis de 2 análisis diarios. Solicita PRO por WhatsApp."
      );
      return false;
    }

    const newUsage = (data.dailyUsage || 0) + 1;

    await setDoc(
      userRef,
      {
        dailyUsage: newUsage,
        lastReset: today,
      },
      { merge: true }
    );

    setUserPlan("free");
    setDailyUsage(newUsage);
    setRemainingAnalyses(Math.max(2 - newUsage, 0));

    return true;
  };

  const upgradeToPro = () => {
    const userEmail = auth.currentUser?.email || "";
    const userUid = auth.currentUser?.uid || "";

    const message = `Hola, quiero activar PRO en JSE Auto App.\nEmail: ${userEmail}\nUID: ${userUid}`;
    const whatsappUrl = `https://wa.me/14698182243?text=${encodeURIComponent(
      message
    )}`;

    window.open(whatsappUrl, "_blank");
  };

  const displayProfit =
    (mode === "comprado" || mode === "vendido") && carData
      ? (() => {
          const buyPrice = toNumber(paidPrice);
          const realAuctionFee = toNumber(auctionFee);
          const realTransport = toNumber(transport);
          const realRepair = toNumber(repair);
          const realOtherCost = toNumber(otherCost);

          const totalInvestment =
            buyPrice +
            realAuctionFee +
            realTransport +
            realRepair +
            realOtherCost;

          const minPrice = carData?.market?.minPrice || 0;
          const maxPrice = carData?.market?.maxPrice || 0;

          const minProfit = minPrice - totalInvestment;
          const maxProfit = maxPrice - totalInvestment;

          const recommendedSalePrice = Math.round(
            minPrice + (maxPrice - minPrice) * 0.55
          );

          return {
            buyPrice,
            auctionFee: realAuctionFee,
            transport: realTransport,
            repair: realRepair,
            otherCost: realOtherCost,
            totalInvestment,
            minProfit,
            maxProfit,
            recommendedSalePrice,
          };
        })()
      : carData?.profit || null;

  const displaySold =
    mode === "vendido" && carData
      ? (() => {
          const realSoldPrice = toNumber(soldPrice);
          const totalInvestment = displayProfit?.totalInvestment || 0;
          const finalProfit = realSoldPrice - totalInvestment;

          return {
            soldPrice: realSoldPrice,
            totalInvestment,
            finalProfit,
          };
        })()
      : carData?.sold || null;

  const loadHistory = async () => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "car_history"),
      where("userId", "==", auth.currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);
    setHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const saveCar = async () => {
    if (!carData || !auth.currentUser) {
      alert("No hay carro para guardar");
      return;
    }

    const payload = {
      userId: auth.currentUser.uid,
      mode,
      vin: carData.vehicle?.vin || vin,
      year: carData.vehicle?.year || "",
      make: carData.vehicle?.make || "",
      model: carData.vehicle?.model || manualModel || "",

      minPrice: carData.market?.minPrice || 0,
      maxPrice: carData.market?.maxPrice || 0,
      avgMarketPrice: carData.market?.avgMarketPrice || 0,
      listingsFound: carData.market?.listingsFound || 0,

      dealScore: carData.deal?.dealScore || 0,
      decision: carData.deal?.decision || "",
      aggressiveOffer: carData.deal?.aggressiveOffer || 0,
      safeOffer: carData.deal?.safeOffer || 0,
      dontPayMoreThan: carData.deal?.dontPayMoreThan || 0,
      maxRecommended: carData.deal?.maxRecommended || 0,
      message: carData.deal?.message || "",

      potentialProfit:
        (carData.market?.minPrice || 0) -
        (carData.deal?.dontPayMoreThan || 0),

      profit:
        mode === "comprado" || mode === "vendido"
          ? displayProfit
          : carData.profit || null,

      sold: mode === "vendido" ? displaySold : carData.sold || null,

      updatedAt: serverTimestamp(),
    };

    if (editingHistoryId) {
      await updateDoc(doc(db, "car_history", editingHistoryId), payload);
      alert(mode === "vendido" ? "Venta guardada ✅" : "Carro actualizado ✅");
      setEditingHistoryId(null);
    } else {
      await addDoc(collection(db, "car_history"), {
        ...payload,
        createdAt: serverTimestamp(),
      });
      alert("Guardado ✅");
    }

    loadHistory();
  };

  const deleteCar = async (id: string) => {
    const ok = confirm("¿Seguro que quieres eliminar este carro?");
    if (!ok) return;

    await deleteDoc(doc(db, "car_history", id));

    if (selectedCar?.id === id) {
      setSelectedCar(null);
    }

    alert("Eliminado ✅");
    loadHistory();
  };

  const moveToComprado = async (car: any) => {
    const ok = confirm("¿Mover este carro a COMPRADO?");
    if (!ok) return;

    await updateDoc(doc(db, "car_history", car.id), {
      mode: "comprado",
      updatedAt: serverTimestamp(),
    });

    setSelectedCar(null);
    alert("Movido a COMPRADO ✅");
    loadHistory();
  };

  const loadCarForComprado = (car: any) => {
    setMode("comprado");
    setSelectedCar(car);
    setEditingHistoryId(car.id);

    setVin(car.vin || "");
    setManualModel(car.model || "");
    setMileage("120000");

    setPaidPrice(car.profit?.buyPrice?.toString() || "");
    setAuctionFee(car.profit?.auctionFee?.toString() || "");
    setTransport(car.profit?.transport?.toString() || "");
    setRepair(car.profit?.repair?.toString() || "");
    setOtherCost(car.profit?.otherCost?.toString() || "");
    setSoldPrice("");

    setCarData({
      vehicle: {
        vin: car.vin,
        year: car.year,
        make: car.make,
        model: car.model,
      },
      market: {
        minPrice: car.minPrice || 0,
        maxPrice: car.maxPrice || 0,
        avgMarketPrice: car.avgMarketPrice || 0,
        listingsFound: car.listingsFound || 0,
      },
      deal: {
        dealScore: car.dealScore || 0,
        decision: car.decision || "",
        aggressiveOffer: car.aggressiveOffer || 0,
        safeOffer: car.safeOffer || 0,
        dontPayMoreThan: car.dontPayMoreThan || 0,
        maxRecommended: car.maxRecommended || 0,
        message: car.message || "",
      },
      profit: car.profit || null,
      sold: car.sold || null,
    });

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 100);
  };

  const loadCarForVendido = (car: any) => {
    setMode("vendido");
    setSelectedCar(car);
    setEditingHistoryId(car.id);

    setVin(car.vin || "");
    setManualModel(car.model || "");
    setMileage("120000");

    setPaidPrice(car.profit?.buyPrice?.toString() || "");
    setAuctionFee(car.profit?.auctionFee?.toString() || "");
    setTransport(car.profit?.transport?.toString() || "");
    setRepair(car.profit?.repair?.toString() || "");
    setOtherCost(car.profit?.otherCost?.toString() || "");
    setSoldPrice(car.sold?.soldPrice?.toString() || "");

    setCarData({
      vehicle: {
        vin: car.vin,
        year: car.year,
        make: car.make,
        model: car.model,
      },
      market: {
        minPrice: car.minPrice || 0,
        maxPrice: car.maxPrice || 0,
        avgMarketPrice: car.avgMarketPrice || 0,
        listingsFound: car.listingsFound || 0,
      },
      deal: {
        dealScore: car.dealScore || 0,
        decision: car.decision || "",
        aggressiveOffer: car.aggressiveOffer || 0,
        safeOffer: car.safeOffer || 0,
        dontPayMoreThan: car.dontPayMoreThan || 0,
        maxRecommended: car.maxRecommended || 0,
        message: car.message || "",
      },
      profit: car.profit || null,
      sold: car.sold || null,
    });

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 100);
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      setIsLogged(true);

      setTimeout(() => {
        loadHistory();
        loadUserPlan();
      }, 500);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    try {
      if (!email || !password) {
        alert("Pon email y contraseña");
        return;
      }

      if (password.length < 6) {
        alert("La contraseña debe tener mínimo 6 caracteres");
        return;
      }

      setLoading(true);

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await setDoc(doc(db, "users", userCredential.user.uid), {
        email,
        plan: "free",
        dailyUsage: 0,
        lastReset: today,
        createdAt: serverTimestamp(),
      });

      setIsLogged(true);

      setTimeout(() => {
        loadHistory();
        loadUserPlan();
      }, 500);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetSearch = () => {
    setVin("");
    setManualModel("");
    setCarData(null);
    setSelectedCar(null);
    setEditingHistoryId(null);
    setShowScanner(false);

    setPaidPrice("");
    setAuctionFee("");
    setTransport("");
    setRepair("");
    setOtherCost("");
    setSoldPrice("");
  };

  const analyzeDeal = async () => {
    if (!vin && !manualModel) {
      alert("Pon un VIN o modelo");
      return;
    }

    const canUse = await checkUsageLimit();
    if (!canUse) return;

    try {
      setAnalyzing(true);

      const res = await fetch("/api/vehicle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
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
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        alert("Error API: " + text);
        return;
      }

      const data = await res.json();
      setCarData(data);

      setTimeout(() => {
        document.getElementById("result")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 200);
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const score = carData?.deal?.dealScore || 0;

  const scoreColor =
    score >= 70
      ? "text-green-400"
      : score >= 50
      ? "text-yellow-400"
      : "text-red-400";

  const potentialProfit =
    (carData?.market?.minPrice || 0) - (carData?.deal?.dontPayMoreThan || 0);

  const modeHistory = history.filter((car) => car.mode === mode);

  const totalCars = modeHistory.length;

  const totalPotentialProfit = modeHistory.reduce(
    (sum, car) => sum + (car.potentialProfit || 0),
    0
  );

  const totalRealProfit = modeHistory.reduce((sum, car) => {
    if (!car.profit) return sum;
    return sum + (car.profit.maxProfit || car.profit.minProfit || 0);
  }, 0);

  const totalFinalProfit = modeHistory.reduce((sum, car) => {
    if (!car.sold) return sum;
    return sum + (car.sold.finalProfit || 0);
  }, 0);

  const comprarCount = modeHistory.filter(
    (car) => car.decision === "COMPRAR"
  ).length;

  const walkAwayCount = modeHistory.filter(
    (car) => car.decision === "NO COMPRAR"
  ).length;

  const bestCar = modeHistory.reduce((best, car) => {
    if (!best) return car;

    const carValue =
      mode === "vendido"
        ? car.sold?.finalProfit || 0
        : mode === "comprado"
        ? car.profit?.maxProfit || 0
        : car.potentialProfit || 0;

    const bestValue =
      mode === "vendido"
        ? best.sold?.finalProfit || 0
        : mode === "comprado"
        ? best.profit?.maxProfit || 0
        : best.potentialProfit || 0;

    return carValue > bestValue ? car : best;
  }, null as any);

  const filteredAdminUsers = adminUsers.filter((u) => {
    const emailText = (u.email || "").toLowerCase();
    const idText = (u.id || "").toLowerCase();
    const search = adminSearch.toLowerCase();

    return emailText.includes(search) || idText.includes(search);
  });

  const totalAdminUsers = adminUsers.length;
  const totalProUsers = adminUsers.filter((u) => u.plan === "pro").length;
  const totalFreeUsers = adminUsers.filter((u) => u.plan !== "pro").length;
  const totalUsedToday = adminUsers.reduce(
    (sum, u) => sum + (u.dailyUsage || 0),
    0
  );

  const getProfitStatus = (profit: number) => {
    if (profit >= 1500) return "🔥 Profit fuerte";
    if (profit >= 700) return "🟢 Profit bueno";
    if (profit >= 300) return "🟡 Profit bajo";
    return "🔴 Poco margen";
  };

  if (!isLogged) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#0f172a] border border-blue-500 rounded-2xl p-6">
          <h1 className="text-2xl font-bold text-center mb-2">
            JSE AUTO GROUP
          </h1>
          <p className="text-center text-gray-400 mb-6">Login / Crear cuenta</p>

          <label className={labelClass}>Email</label>
          <input
            type="email"
            placeholder="Ingresa tu email"
            className={fieldClass}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label className={labelClass}>Contraseña</label>
          <input
            type="password"
            placeholder="Mínimo 6 caracteres"
            className={fieldClass}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="mt-2 w-full bg-blue-500 py-3 rounded font-bold"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <button
            type="button"
            onClick={handleCreateAccount}
            disabled={loading}
            className="mt-3 w-full bg-green-600 py-3 rounded font-bold"
          >
            Crear cuenta nueva
          </button>
        </div>
      </main>
    );
  }

  if (!mode) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#0f172a] border border-blue-500 rounded-2xl p-6">
          <h1 className="text-3xl font-bold text-center text-blue-400 mb-2">
            ¿Qué vas a hacer?
          </h1>

          <p className="text-center text-gray-400 mb-6">
            Escoge el modo para analizar el carro
          </p>

          {isAdmin && (
            <button
              onClick={() => {
                setMode("admin");
                loadAdminUsers();
              }}
              className="w-full bg-red-700 py-5 rounded-xl font-bold text-xl mb-4"
            >
              ADMIN PANEL
              <span className="block text-sm font-normal">
                Usuarios, PRO, límites y control
              </span>
            </button>
          )}

          <button
            onClick={() => {
              setMode("comprando");
              resetSearch();
            }}
            className="w-full bg-blue-500 py-5 rounded-xl font-bold text-xl mb-4"
          >
            COMPRANDO
            <span className="block text-sm font-normal">
              Subasta rápida / decidir si comprar
            </span>
          </button>

          <button
            onClick={() => {
              setMode("comprado");
              resetSearch();
            }}
            className="w-full bg-green-600 py-5 rounded-xl font-bold text-xl mb-4"
          >
            COMPRADO
            <span className="block text-sm font-normal">
              Calcular profit real después de comprar
            </span>
          </button>

          <button
            onClick={() => {
              setMode("vendido");
              resetSearch();
            }}
            className="w-full bg-purple-600 py-5 rounded-xl font-bold text-xl"
          >
            VENDIDO
            <span className="block text-sm font-normal">
              Ganancia final real
            </span>
          </button>
        </div>
      </main>
    );
  }

  if (mode === "admin") {
    return (
      <main className="min-h-screen bg-black text-white p-4 md:p-10">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => setMode(null)}
            className="mb-4 bg-gray-800 border border-gray-600 px-4 py-2 rounded"
          >
            ← Cambiar modo
          </button>

          {!isAdmin ? (
            <div className="bg-red-900/40 border border-red-500 rounded-xl p-5">
              No tienes permiso para ver este panel.
            </div>
          ) : (
            <div className="bg-[#1a0b0b] border border-red-500 rounded-2xl p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-3xl font-bold text-red-400">
                    ADMIN PANEL
                  </h2>
                  <p className="text-gray-400">
                    Solo visible para {ADMIN_EMAIL}
                  </p>
                </div>

                <button
                  onClick={loadAdminUsers}
                  className="bg-red-600 hover:bg-red-700 px-5 py-3 rounded font-bold"
                >
                  {adminLoading ? "Cargando..." : "Actualizar usuarios"}
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <div className="bg-black p-4 rounded-xl border border-gray-700">
                  <p className="text-gray-400 text-sm">Usuarios</p>
                  <p className="text-2xl font-bold">{totalAdminUsers}</p>
                </div>

                <div className="bg-black p-4 rounded-xl border border-green-500">
                  <p className="text-gray-400 text-sm">PRO</p>
                  <p className="text-2xl font-bold text-green-400">
                    {totalProUsers}
                  </p>
                </div>

                <div className="bg-black p-4 rounded-xl border border-yellow-500">
                  <p className="text-gray-400 text-sm">FREE</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {totalFreeUsers}
                  </p>
                </div>

                <div className="bg-black p-4 rounded-xl border border-blue-500">
                  <p className="text-gray-400 text-sm">Análisis hoy</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {totalUsedToday}
                  </p>
                </div>
              </div>

              <div className="bg-black p-4 rounded-xl border border-green-500 mb-5">
                <h3 className="font-bold text-lg mb-3">
                  Crear usuario con email y contraseña
                </h3>

                <input
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="Email del usuario"
                  className={fieldClass}
                />

                <input
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Contraseña mínimo 6 caracteres"
                  type="password"
                  className={fieldClass}
                />

                <button
                  onClick={adminCreateUser}
                  className="w-full bg-green-600 hover:bg-green-700 py-3 rounded font-bold"
                >
                  Crear usuario FREE
                </button>
              </div>

              <div className="bg-black p-4 rounded-xl border border-gray-700 mb-5">
                <h3 className="font-bold text-lg mb-3">
                  Crear/actualizar usuario solo en Firestore por UID
                </h3>

                <input
                  value={adminUid}
                  onChange={(e) => setAdminUid(e.target.value)}
                  placeholder="UID del usuario"
                  className={fieldClass}
                />

                <input
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="Email del usuario"
                  className={fieldClass}
                />

                <button
                  onClick={createOrUpdateUserByUid}
                  className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded font-bold"
                >
                  Crear/actualizar registro FREE
                </button>
              </div>

              <input
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                placeholder="Buscar usuario por email o UID"
                className={fieldClass}
              />

              {filteredAdminUsers.length === 0 ? (
                <p className="text-gray-400">No hay usuarios cargados.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAdminUsers.map((u) => (
                    <div
                      key={u.id}
                      className="bg-black p-4 rounded-xl border border-gray-700"
                    >
                      <p className="font-bold text-lg">
                        {u.email || "Sin email"}
                      </p>

                      <p className="text-gray-500 text-xs break-all">
                        UID: {u.id}
                      </p>

                      <p
                        className={
                          u.plan === "pro"
                            ? "text-green-400 font-bold mt-2"
                            : "text-yellow-400 font-bold mt-2"
                        }
                      >
                        Plan: {u.plan === "pro" ? "PRO" : "FREE"}
                      </p>

                      <p className="text-gray-300">
                        Uso diario: {u.dailyUsage || 0}/2
                      </p>

                      <p className="text-gray-500 text-sm">
                        Reset: {u.lastReset || "N/A"}
                      </p>

                      <div className="grid grid-cols-1 gap-2 mt-4">
                        <button
                          onClick={() => setUserPlanByUid(u.id, "pro")}
                          className="bg-green-600 hover:bg-green-700 py-2 rounded font-bold"
                        >
                          Activar PRO
                        </button>

                        <button
                          onClick={() => setUserPlanByUid(u.id, "free")}
                          className="bg-yellow-600 hover:bg-yellow-700 py-2 rounded font-bold"
                        >
                          Quitar PRO
                        </button>

                        <button
                          onClick={() => resetUserUsage(u.id)}
                          className="bg-blue-600 hover:bg-blue-700 py-2 rounded font-bold"
                        >
                          Resetear análisis
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-10">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => {
            setMode(null);
            resetSearch();
          }}
          className="mb-4 bg-gray-800 border border-gray-600 px-4 py-2 rounded"
        >
          ← Cambiar modo
        </button>

        {editingHistoryId && mode === "comprado" && (
          <div className="mb-4 bg-green-900/40 border border-green-500 rounded-xl p-4">
            <p className="font-bold text-green-400">Editando carro comprado</p>
            <p className="text-gray-300 text-sm">
              Pon o cambia gastos. Al guardar se actualiza el mismo carro.
            </p>
          </div>
        )}

        {editingHistoryId && mode === "vendido" && (
          <div className="mb-4 bg-purple-900/40 border border-purple-500 rounded-xl p-4">
            <p className="font-bold text-purple-300">
              Registrando venta final
            </p>
            <p className="text-gray-300 text-sm">
              Ingresa el precio vendido. La app calcula la ganancia final real.
            </p>
          </div>
        )}

        {mode !== "vendido" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-[#0f172a] border border-blue-500 rounded-2xl p-5 md:p-8">
              <h1 className="text-3xl font-bold text-blue-400 mb-2">
                {mode === "comprando" ? "COMPRANDO" : "COMPRADO"}
              </h1>

              <p className="text-gray-400 mb-6">
                {mode === "comprando"
                  ? "Modo rápido para subasta"
                  : "Calcula cuánto vender y cuánto vas a ganar"}
              </p>

              <div className="mb-4 bg-black border border-blue-500 rounded-xl p-4">
                <p className="text-gray-400 text-sm">Plan actual</p>

                <p
                  className={`text-xl font-bold ${
                    userPlan === "pro" ? "text-green-400" : "text-yellow-400"
                  }`}
                >
                  {userPlan === "pro" ? "PRO ilimitado" : "FREE"}
                </p>

                {userPlan !== "pro" && (
                  <>
                    <p className="text-gray-300 text-sm mt-1">
                      Te quedan {remainingAnalyses} análisis gratis hoy
                    </p>

                    <button
                      type="button"
                      onClick={upgradeToPro}
                      className="w-full bg-green-600 hover:bg-green-700 py-3 rounded font-bold mt-3"
                    >
                      🚀 Solicitar PRO por WhatsApp
                    </button>
                  </>
                )}
              </div>

              <label className={labelClass}>VIN del vehículo</label>
              <input
                value={vin}
                onChange={(e) => setVin(e.target.value.toUpperCase())}
                placeholder="Ej: 2LMDJ8JK9EBL12143"
                className={`${fieldClass} font-bold`}
              />

              {mode === "comprando" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.location.protocol !== "https:") {
                        alert(
                          "Para usar cámara necesitas abrir la app con HTTPS."
                        );
                        return;
                      }
                      setShowScanner(!showScanner);
                    }}
                    className="w-full mb-4 bg-gray-800 border border-blue-500 py-3 rounded font-bold"
                  >
                    {showScanner ? "Cerrar scanner" : "Escanear VIN con cámara"}
                  </button>

                  {showScanner && (
                    <div className="mb-4 bg-black p-3 rounded border border-blue-500">
                      <VinScanner
                        onScan={(data: string) => {
                          setVin(data);
                          setShowScanner(false);
                        }}
                      />
                    </div>
                  )}
                </>
              )}

              <label className={labelClass}>Modelo manual opcional</label>
              <input
                value={manualModel}
                onChange={(e) => setManualModel(e.target.value)}
                placeholder="Ej: MKX, Altima, Pathfinder"
                className={fieldClass}
              />

              <label className={labelClass}>Millas aproximadas</label>
              <select
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                className={fieldClass}
              >
                <option value="120000">Millas desconocidas (usar 120k)</option>
                <option value="70000">Menos de 80k</option>
                <option value="90000">80k - 100k</option>
                <option value="110000">100k - 120k</option>
                <option value="135000">120k - 150k</option>
                <option value="165000">150k - 180k</option>
                <option value="200000">Más de 180k</option>
              </select>

              {mode === "comprando" && (
                <>
                  <label className={labelClass}>Condición del carro</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className={fieldClass}
                  >
                    <option>Excelente</option>
                    <option>Buena</option>
                    <option>Regular</option>
                    <option>Mala</option>
                  </select>

                  <label className={labelClass}>Tipo de título</label>
                  <select
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={fieldClass}
                  >
                    <option>Clean</option>
                    <option>Rebuilt</option>
                    <option>Salvage</option>
                  </select>

                  <label className={labelClass}>Demanda del mercado</label>
                  <select
                    value={demand}
                    onChange={(e) => setDemand(e.target.value)}
                    className={fieldClass}
                  >
                    <option>Alta</option>
                    <option>Media</option>
                    <option>Baja</option>
                  </select>
                </>
              )}

              {mode === "comprado" && (
                <>
                  <label className={labelClass}>Precio pagado por el carro</label>
                  <input
                    value={paidPrice}
                    onChange={(e) => setPaidPrice(e.target.value)}
                    placeholder="Ej: 1860"
                    className={fieldClass}
                  />

                  <label className={labelClass}>Fee de subasta</label>
                  <input
                    value={auctionFee}
                    onChange={(e) => setAuctionFee(e.target.value)}
                    placeholder="Ej: 250"
                    className={fieldClass}
                  />

                  <label className={labelClass}>Transporte</label>
                  <input
                    value={transport}
                    onChange={(e) => setTransport(e.target.value)}
                    placeholder="Ej: 300"
                    className={fieldClass}
                  />

                  <label className={labelClass}>Reparación estimada</label>
                  <input
                    value={repair}
                    onChange={(e) => setRepair(e.target.value)}
                    placeholder="Ej: 1000"
                    className={fieldClass}
                  />

                  <label className={labelClass}>Otros gastos</label>
                  <input
                    value={otherCost}
                    onChange={(e) => setOtherCost(e.target.value)}
                    placeholder="Ej: 150"
                    className={fieldClass}
                  />
                </>
              )}

              {mode === "comprado" && editingHistoryId ? (
                <button
                  type="button"
                  onClick={saveCar}
                  className="w-full bg-green-600 hover:bg-green-700 py-4 rounded font-bold text-lg mt-2"
                >
                  💾 Guardar gastos y actualizar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={analyzeDeal}
                  disabled={analyzing}
                  className="w-full bg-blue-500 hover:bg-blue-600 py-4 rounded font-bold text-lg mt-2"
                >
                  {analyzing ? "Analizando..." : "Analizar"}
                </button>
              )}
            </section>

            <section
              id="result"
              className="bg-[#0f172a] border border-blue-500 rounded-2xl p-5 md:p-8"
            >
              {!carData ? (
                <div className="h-full flex items-center justify-center text-gray-400 text-center">
                  Ingresa el VIN y presiona analizar
                </div>
              ) : (
                <>
                  <h2 className="text-3xl font-bold text-blue-400 mb-2">
                    {carData?.vehicle?.year} {carData?.vehicle?.make}{" "}
                    {carData?.vehicle?.model || manualModel}
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                    <div className="bg-black p-5 rounded-xl">
                      <p className="text-gray-300">Precio bajo mercado</p>
                      <h3 className="text-3xl font-bold">
                        ${carData?.market?.minPrice ?? 0}
                      </h3>
                    </div>

                    <div className="bg-black p-5 rounded-xl">
                      <p className="text-gray-300">Precio alto mercado</p>
                      <h3 className="text-3xl font-bold">
                        ${carData?.market?.maxPrice ?? 0}
                      </h3>
                    </div>
                  </div>

                  {mode === "comprando" && (
                    <>
                      <div
                        className={`bg-black p-5 rounded-xl border mb-5 ${
                          potentialProfit >= 1000
                            ? "border-green-500"
                            : potentialProfit >= 300
                            ? "border-yellow-500"
                            : "border-red-500"
                        }`}
                      >
                        <p className="text-gray-300">
                          Ganancia potencial estimada
                        </p>

                        <h3
                          className={`text-4xl font-bold ${
                            potentialProfit >= 1000
                              ? "text-green-400"
                              : potentialProfit >= 300
                              ? "text-yellow-400"
                              : "text-red-400"
                          }`}
                        >
                          ${potentialProfit}
                        </h3>

                        <p className="text-sm text-gray-400 mt-2">
                          Si compras al máximo recomendado y vendes al mínimo
                          del mercado.
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mt-4 mb-5">
                        <div className="bg-black p-3 rounded text-center border border-gray-800">
                          <p className="text-gray-400 text-sm">BUY</p>
                          <p className="text-green-400 font-bold">
                            ${carData?.deal?.aggressiveOffer ?? 0}
                          </p>
                        </div>

                        <div className="bg-black p-3 rounded text-center border border-gray-800">
                          <p className="text-gray-400 text-sm">SAFE</p>
                          <p className="text-yellow-400 font-bold">
                            ${carData?.deal?.safeOffer ?? 0}
                          </p>
                        </div>

                        <div className="bg-black p-3 rounded text-center border border-gray-800">
                          <p className="text-gray-400 text-sm">MAX</p>
                          <p className="text-red-400 font-bold">
                            ${carData?.deal?.dontPayMoreThan ?? 0}
                          </p>
                        </div>
                      </div>

                      <div className="bg-black p-5 rounded-xl border border-blue-500 mb-5">
                        <p className="text-gray-300">
                          Máximo recomendado para pagar
                        </p>
                        <h3 className="text-4xl font-bold text-yellow-400">
                          ${carData?.deal?.dontPayMoreThan ?? 0}
                        </h3>
                      </div>

                      <div className="bg-black p-5 rounded-xl border border-gray-700 mb-5">
                        <p className="text-gray-400">Deal Score</p>
                        <h3 className={`text-4xl font-bold ${scoreColor}`}>
                          {score}/100
                        </h3>
                      </div>

                      <h2
                        className={`font-extrabold mt-6 ${
                          carData?.deal?.decision === "COMPRAR"
                            ? "text-green-400 text-5xl"
                            : carData?.deal?.decision === "DUDOSO"
                            ? "text-yellow-400 text-5xl"
                            : "text-red-500 text-5xl"
                        }`}
                      >
                        {carData?.deal?.decision === "COMPRAR"
                          ? "🟢 COMPRAR"
                          : carData?.deal?.decision === "DUDOSO"
                          ? "🟡 DUDOSO"
                          : "❌ WALK AWAY"}
                      </h2>

                      {carData?.deal?.decision === "NO COMPRAR" && (
                        <p className="text-red-300 mt-2 font-semibold">
                          ⚠️ Alto riesgo de perder dinero
                        </p>
                      )}

                      <p className="mt-3 text-gray-200">
                        {carData?.deal?.message}
                      </p>
                    </>
                  )}

                  {mode === "comprado" && (
                    <div className="mt-6 bg-black p-5 rounded-xl border border-blue-500">
                      <h3 className="text-2xl font-bold mb-4">
                        💰 Profit real
                      </h3>

                      <p>Precio compra: ${displayProfit?.buyPrice ?? 0}</p>
                      <p>Fee subasta: ${displayProfit?.auctionFee ?? 0}</p>
                      <p>Transporte: ${displayProfit?.transport ?? 0}</p>
                      <p>Reparación: ${displayProfit?.repair ?? 0}</p>
                      <p>Otros gastos: ${displayProfit?.otherCost ?? 0}</p>

                      <div className="my-4 bg-yellow-900/30 border border-yellow-500 p-4 rounded-xl">
                        <p className="text-yellow-300 font-bold">
                          Total inversión
                        </p>
                        <p className="text-3xl font-bold text-yellow-400">
                          ${displayProfit?.totalInvestment ?? 0}
                        </p>
                      </div>

                      <p className="text-green-300">
                        Ganancia conservadora: ${displayProfit?.minProfit ?? 0}
                      </p>
                      <p className="text-green-400 font-bold">
                        Ganancia optimista: ${displayProfit?.maxProfit ?? 0}
                      </p>

                      <p className="text-2xl font-bold mt-3 text-green-400">
                        Precio sugerido para publicar: $
                        {displayProfit?.recommendedSalePrice ?? 0}
                      </p>

                      <p className="text-gray-400 text-sm mt-3">
                        Precio sugerido calculado con el rango de mercado actual.
                        No es venta garantizada.
                      </p>
                    </div>
                  )}

                  {!(mode === "comprado" && editingHistoryId) && (
                    <button
                      onClick={saveCar}
                      className="w-full bg-green-600 hover:bg-green-700 py-3 rounded font-bold mt-5"
                    >
                      💾 Guardar carro
                    </button>
                  )}
                </>
              )}
            </section>
          </div>
        )}

        {mode === "vendido" && editingHistoryId && carData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-[#0f172a] border border-purple-500 rounded-2xl p-5 md:p-8">
              <h1 className="text-3xl font-bold text-purple-400 mb-2">
                VENDIDO
              </h1>

              <p className="text-gray-400 mb-6">
                Registra precio vendido y ganancia final
              </p>

              <label className={labelClass}>VIN del vehículo</label>
              <input
                value={vin}
                readOnly
                className={`${fieldClass} font-bold opacity-80`}
              />

              <label className={labelClass}>Vehículo</label>
              <input
                value={`${carData.vehicle?.year || ""} ${
                  carData.vehicle?.make || ""
                } ${carData.vehicle?.model || ""}`}
                readOnly
                className={`${fieldClass} opacity-80`}
              />

              <label className={labelClass}>Precio vendido final</label>
              <input
                value={soldPrice}
                onChange={(e) => setSoldPrice(e.target.value)}
                placeholder="Ej: 5600"
                className={fieldClass}
              />

              <button
                type="button"
                onClick={saveCar}
                className="w-full bg-purple-600 hover:bg-purple-700 py-4 rounded font-bold text-lg mt-2"
              >
                💰 Guardar venta final
              </button>
            </section>

            <section className="bg-[#0f172a] border border-purple-500 rounded-2xl p-5 md:p-8">
              <h2 className="text-3xl font-bold text-purple-400 mb-4">
                🏁 Venta final
              </h2>

              <div className="bg-black p-5 rounded-xl border border-purple-500">
                <p>Precio vendido: ${displaySold?.soldPrice ?? 0}</p>
                <p>Total inversión: ${displaySold?.totalInvestment ?? 0}</p>

                <p
                  className={`text-4xl font-bold mt-3 ${
                    (displaySold?.finalProfit || 0) >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  Ganancia final: ${displaySold?.finalProfit ?? 0}
                </p>
              </div>
            </section>
          </div>
        )}

        {mode === "vendido" && !editingHistoryId && (
          <div className="bg-[#0f172a] border border-purple-500 rounded-2xl p-5 mb-6">
            <h1 className="text-3xl font-bold text-purple-400 mb-2">
              VENDIDO
            </h1>
            <p className="text-gray-300">
              Para registrar una venta final, primero abre un carro en
              COMPRADO y toca “Marcar como vendido”.
            </p>
          </div>
        )}

        <div className="mt-10 bg-[#0f172a] border border-blue-500 rounded-2xl p-5">
          <h2 className="text-2xl font-bold text-blue-400 mb-4">
            Dashboard{" "}
            {mode === "comprando"
              ? "COMPRANDO"
              : mode === "comprado"
              ? "COMPRADO"
              : "VENDIDO"}
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <div className="bg-black p-4 rounded-xl border border-gray-700">
              <p className="text-gray-400 text-sm">
                {mode === "comprando"
                  ? "Carros analizados"
                  : mode === "comprado"
                  ? "Carros comprados"
                  : "Carros vendidos"}
              </p>
              <p className="text-2xl font-bold">{totalCars}</p>
            </div>

            <div className="bg-black p-4 rounded-xl border border-green-500">
              <p className="text-gray-400 text-sm">
                {mode === "comprando"
                  ? "Profit potencial"
                  : mode === "comprado"
                  ? "Profit real"
                  : "Ganancia final"}
              </p>
              <p className="text-2xl font-bold text-green-400">
                $
                {mode === "comprando"
                  ? totalPotentialProfit
                  : mode === "comprado"
                  ? totalRealProfit
                  : totalFinalProfit}
              </p>
            </div>

            <div className="bg-black p-4 rounded-xl border border-blue-500">
              <p className="text-gray-400 text-sm">Comprar</p>
              <p className="text-2xl font-bold text-green-400">
                {comprarCount}
              </p>
            </div>

            <div className="bg-black p-4 rounded-xl border border-red-500">
              <p className="text-gray-400 text-sm">Walk Away</p>
              <p className="text-2xl font-bold text-red-400">
                {walkAwayCount}
              </p>
            </div>
          </div>

          <div className="bg-black p-4 rounded-xl border border-yellow-500 mb-8">
            <p className="text-gray-400 text-sm">Mejor oportunidad guardada</p>

            {bestCar ? (
              <>
                <p className="font-bold text-lg">
                  {bestCar.year} {bestCar.make} {bestCar.model}
                </p>

                <p className="text-green-400 font-bold">
                  {mode === "comprando"
                    ? `Profit potencial: $${bestCar.potentialProfit || 0}`
                    : mode === "comprado"
                    ? `Profit real: $${bestCar.profit?.maxProfit || 0}`
                    : `Ganancia final: $${bestCar.sold?.finalProfit || 0}`}
                </p>

                <p className="text-gray-400 text-sm">VIN: {bestCar.vin}</p>
              </>
            ) : (
              <p className="text-gray-500">Todavía no hay datos</p>
            )}
          </div>

          <h2 className="text-2xl font-bold text-blue-400 mb-4">
            Historial{" "}
            {mode === "comprando"
              ? "COMPRANDO"
              : mode === "comprado"
              ? "COMPRADO"
              : "VENDIDO"}
          </h2>

          {modeHistory.length === 0 ? (
            <p className="text-gray-400">
              No hay carros guardados en este modo todavía.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modeHistory.map((car) => (
                <div
                  key={car.id}
                  onClick={() =>
                    setSelectedCar(selectedCar?.id === car.id ? null : car)
                  }
                  className="bg-black p-4 rounded-xl border border-gray-700 cursor-pointer"
                >
                  <p className="font-bold text-lg">
                    {car.year} {car.make} {car.model}
                  </p>

                  <p className="text-gray-400 text-sm">VIN: {car.vin}</p>

                  {mode !== "vendido" && (
                    <p className="mt-2">
                      Mercado: ${car.minPrice} - ${car.maxPrice}
                    </p>
                  )}

                  {mode !== "vendido" && <p>Score: {car.dealScore}/100</p>}

                  {mode === "comprando" && (
                    <p
                      className={
                        car.potentialProfit >= 1000
                          ? "text-green-400 font-bold"
                          : car.potentialProfit >= 300
                          ? "text-yellow-400 font-bold"
                          : "text-red-400 font-bold"
                      }
                    >
                      Ganancia potencial: ${car.potentialProfit || 0}
                    </p>
                  )}

                  {mode === "comprado" && car.profit && (
                    <p className="text-green-400 font-bold">
                      {getProfitStatus(car.profit.maxProfit || 0)}: $
                      {car.profit.maxProfit || 0}
                    </p>
                  )}

                  {mode === "comprado" && !car.profit && (
                    <p className="text-yellow-400 font-bold">
                      Pendiente calcular gastos
                    </p>
                  )}

                  {mode === "vendido" && car.sold && (
                    <p
                      className={
                        car.sold.finalProfit >= 0
                          ? "text-green-400 font-bold"
                          : "text-red-400 font-bold"
                      }
                    >
                      Ganancia final: ${car.sold.finalProfit || 0}
                    </p>
                  )}

                  {mode !== "vendido" && (
                    <p
                      className={
                        car.decision === "COMPRAR"
                          ? "text-green-400 font-bold"
                          : car.decision === "DUDOSO"
                          ? "text-yellow-400 font-bold"
                          : "text-red-400 font-bold"
                      }
                    >
                      {mode === "comprado"
                        ? getProfitStatus(car.profit?.maxProfit || 0)
                        : car.decision}
                    </p>
                  )}

                  <p className="text-blue-400 text-sm mt-2">
                    Toca para ver detalles
                  </p>

                  {selectedCar?.id === car.id && (
                    <div className="mt-4 bg-[#0f172a] p-4 rounded-xl border border-blue-500">
                      <h3 className="font-bold text-blue-400 mb-2">
                        Detalles completos
                      </h3>

                      {mode === "comprando" && (
                        <>
                          <p>BUY: ${car.aggressiveOffer || 0}</p>
                          <p>SAFE: ${car.safeOffer || 0}</p>
                          <p>MAX: ${car.dontPayMoreThan || 0}</p>
                          <p>Ganancia potencial: ${car.potentialProfit || 0}</p>
                          <p>
                            Mensaje: {car.message || "Sin mensaje guardado"}
                          </p>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveToComprado(car);
                            }}
                            className="w-full bg-green-600 hover:bg-green-700 py-2 rounded font-bold mt-4"
                          >
                            ✅ Mover a COMPRADO
                          </button>
                        </>
                      )}

                      {mode === "comprado" && car.profit && (
                        <>
                          <p>Precio compra: ${car.profit.buyPrice || 0}</p>
                          <p>Fee: ${car.profit.auctionFee || 0}</p>
                          <p>Transporte: ${car.profit.transport || 0}</p>
                          <p>Reparación: ${car.profit.repair || 0}</p>
                          <p>Otros: ${car.profit.otherCost || 0}</p>

                          <p className="text-yellow-400 font-bold mt-2">
                            Total inversión: $
                            {car.profit.totalInvestment || 0}
                          </p>

                          <p>
                            Ganancia conservadora: $
                            {car.profit.minProfit || 0}
                          </p>
                          <p>
                            Ganancia optimista: $
                            {car.profit.maxProfit || 0}
                          </p>
                          <p>
                            Precio sugerido: $
                            {car.profit.recommendedSalePrice || 0}
                          </p>
                        </>
                      )}

                      {mode === "comprado" && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              loadCarForComprado(car);
                            }}
                            className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded font-bold mt-4"
                          >
                            🧾 Editar gastos y profit
                          </button>

                          {car.profit && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                loadCarForVendido(car);
                              }}
                              className="w-full bg-purple-600 hover:bg-purple-700 py-2 rounded font-bold mt-3"
                            >
                              🏁 Marcar como vendido
                            </button>
                          )}
                        </>
                      )}

                      {mode === "vendido" && car.sold && (
                        <>
                          <p>Precio vendido: ${car.sold.soldPrice || 0}</p>
                          <p>
                            Total inversión: $
                            {car.sold.totalInvestment || 0}
                          </p>
                          <p
                            className={
                              car.sold.finalProfit >= 0
                                ? "text-green-400 font-bold"
                                : "text-red-400 font-bold"
                            }
                          >
                            Ganancia final: ${car.sold.finalProfit || 0}
                          </p>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              loadCarForVendido(car);
                            }}
                            className="w-full bg-purple-600 hover:bg-purple-700 py-2 rounded font-bold mt-4"
                          >
                            ✏️ Editar venta final
                          </button>
                        </>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCar(car.id);
                        }}
                        className="w-full bg-red-600 hover:bg-red-700 py-2 rounded font-bold mt-3"
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}