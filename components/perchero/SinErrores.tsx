"use client";

import { Component, type ReactNode } from "react";

/**
 * Si una remera falla al cargar (ej. falta su foto), se saltea en vez de
 * romper todo el perchero. Avisa en la consola cuál fue.
 */
export class SinErrores extends Component<{ nombre: string; children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch(error: unknown) {
    console.warn(`No se pudo cargar "${this.props.nombre}":`, error);
  }
  render() {
    return this.state.error ? null : this.props.children;
  }
}
