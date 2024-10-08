"use client";
import Image from "next/image";
import React from "react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { type ClassValue, clsx } from 'clsx';
import WordRotate from "./components/aceternity/rotate";
import Particles from "./components/aceternity/particles";
import { useTheme } from "next-themes";


export default function Home() {
  const { theme } = useTheme();
  const [color, setColor] = useState("#000000");
 
  useEffect(() => {
    setColor(theme === "dark" ? "#ffffff" : "#000000");
  }, [theme]);


  return (
    <>
      <div className="text-black edu-au-vic-wa-nt-hand-italic flex justify-center items-center mt-4">NewPals</div>
      <div className="text-black dm-serif-text-regular-italic flex justify-center items-center min-h-screen mx-4 md:mx-16 lg:mx-32 mt-[-50px]">
        <Particles
          className="absolute inset-0"
          quantity={100}
          ease={80}
          color={color}
          refresh
        />      
        <div className="text-center text-5xl md:text-7xl"> 
          <span className="chivo-Roman lg:text-7xl block">A picture is</span>
          <span className="dm-serif-text-regular-italic lg:text-8xl block"> worth a 1000</span>
          <WordRotate className="dm-serif-text-regular font-bold lg:text-8xl" words={["friends", "connections", "interests", "secrets"]}/>
        </div>
        <div className="absolute bottom-10 flex items-center">
          <a className="text-xl md:text-2xl mr-16" href="/submit">Make a connection</a>
          <a className="text-xl md:text-2xl" href="/search">Find someone </a>
        </div>
      </div>
    </>
  );
}
