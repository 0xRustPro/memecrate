import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { WalletButton } from "../../components/WalletButton";
import { CreateMemeSection } from "./sections/CreateMemeSection";
import { PortfolioSection } from "./sections/PortfolioSection";

export const Element = (): JSX.Element => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState<"crate" | "portfolio">(
    "crate",
  );

  return (
    <div className="bg-[#060606] overflow-hidden w-full min-h-screen flex flex-col">
      <header className="relative w-full flex flex-col lg:flex-row items-center justify-between px-4 sm:px-6 lg:px-[46px] pt-4 sm:pt-6 lg:pt-9 pb-4 sm:pb-6 gap-4 lg:gap-0">
        <div className="w-auto flex items-center gap-2 flex-shrink-0">
          <img src="/memecrate.svg" alt="MEMECRATE" className="h-16" />
          <h1 className="[font-family:'Public_Sans',Helvetica] font-semibold text-[#BBFE03] text-lg sm:text-xl lg:text-[20.1px] tracking-[0] leading-[normal] whitespace-nowrap">
            MEMECRATE
          </h1>
        </div>

        <nav className="relative lg:absolute lg:left-1/2 lg:-translate-x-1/2 inline-flex justify-center p-2.5 bg-[#343434] items-center gap-2.5 rounded-xl">
          <Button
            onClick={() => {
              setActiveTab("crate");
              navigate("/crate");
            }}
            className={`h-auto px-2 sm:px-[7px] py-[3px] ${
              activeTab === "crate" ? "bg-[#d8d8d8]" : "bg-transparent"
            } hover:bg-[#d8d8d8]/90`}
          >
            <span
              className={`[font-family:'Inter',Helvetica] font-medium text-sm sm:text-base tracking-[0] leading-[normal] whitespace-nowrap ${
                activeTab === "crate" ? "text-[#2c2c2c]" : "text-white"
              }`}
            >
              Crate
            </span>
          </Button>

          <Button
            onClick={() => {
              setActiveTab("portfolio");
              navigate("/your-crates");
            }}
            className={`h-auto px-2 sm:px-[7px] py-[3px] ${
              activeTab === "portfolio" ? "bg-[#d8d8d8]" : "bg-transparent"
            } hover:bg-[#d8d8d8]/90`}
          >
            <span
              className={`[font-family:'Inter',Helvetica] font-medium text-sm sm:text-base tracking-[0] leading-[normal] whitespace-nowrap ${
                activeTab === "portfolio" ? "text-[#2c2c2c]" : "text-white"
              }`}
            >
              Portfolio
            </span>
          </Button>
        </nav>

        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">  
          <WalletButton />
        </div>
      </header>

      <main className="w-full relative flex flex-col">
        <CreateMemeSection />
        <PortfolioSection />
      </main>
    </div>
  );
};
