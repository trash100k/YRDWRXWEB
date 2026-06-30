import { Component, ErrorInfo, ReactNode } from 'react'
import ReducedScene from './ReducedScene'

interface State { hasError: boolean }

export class CanvasErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[YardWorx] 3D canvas error — falling back to static scene:', error.message, info.componentStack)
  }

  render() {
    if (this.state.hasError) return <ReducedScene />
    return this.props.children
  }
}
