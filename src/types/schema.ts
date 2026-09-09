export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UbicacionPunto = {
  lat: number;
  lng: number;
};

export type TipoResiduo =
  | "organico"
  | "reciclable"
  | "no_reciclable"
  | "vidrio"
  | "papel_carton"
  | "plastico"
  | "metal"
  | "peligroso"
  | "mixto";

export type EstadoContenedor =
  | "activo"
  | "inactivo"
  | "en_mantenimiento"
  | "repleto";

export type RolUsuario = "Admin" | "Operador" | "Ciudadano";

export type MaterialReciclaje =
  | "organico"
  | "vidrio"
  | "papel_carton"
  | "plastico"
  | "metal";

export type TipoNotificacion =
  | "alerta_llenado"
  | "alerta_predictiva"
  | "solicitud_acceso"
  | "jornada"
  | "sistema";

export interface Contenedor {
  id: string;
  numero_identificacion: string;
  ubicacion: UbicacionPunto | null;
  capacidad: number;
  nivel_llenado: number;
  tipo_residuo: TipoResiduo;
  estado: EstadoContenedor;
  ultima_lectura: string | null;
  zona: string | null;
  created_at: string;
}

export type InsertContenedor = Omit<Contenedor, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export type UpdateContenedor = Partial<Contenedor>;

export interface LecturaSensor {
  id: string;
  contenedor_id: string;
  nivel_llenado: number;
  temperatura: number | null;
  fecha_hora: string;
  bateria: number | null;
  created_at: string;
}

export type InsertLecturaSensor = Omit<LecturaSensor, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export type UpdateLecturaSensor = Partial<LecturaSensor>;

export interface Ruta {
  id: string;
  nombre: string;
  zona: string | null;
  contenedores_asignados: string[];
  fecha_creacion: string;
  ultima_ejecucion: string | null;
  distancia_total: number | null;
  tiempo_estimado: string | null;
  created_at: string;
}

export type InsertRuta = Omit<Ruta, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export type UpdateRuta = Partial<Ruta>;

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  telefono: string | null;
  zona_asignada: string | null;
  puntos_reciclaje: number;
  created_at: string;
}

export type InsertUsuario = Omit<Usuario, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export type UpdateUsuario = Partial<Usuario>;

export interface PuntosReciclaje {
  id: string;
  usuario_id: string;
  fecha: string;
  material: MaterialReciclaje;
  cantidad: number;
  puntos_ganados: number;
  validado_por: string | null;
  created_at: string;
}

export type InsertPuntosReciclaje = Omit<PuntosReciclaje, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export type UpdatePuntosReciclaje = Partial<PuntosReciclaje>;

export interface HistorialRuta {
  id: string;
  ruta_id: string | null;
  fecha_ejecucion: string;
  contenedores_recogidos: string[];
  tiempo_real: string | null;
  combustible_consumido: number | null;
  observaciones: string | null;
  created_at: string;
}

export type InsertHistorialRuta = Omit<HistorialRuta, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export type UpdateHistorialRuta = Partial<HistorialRuta>;

export interface Notificacion {
  id: string;
  usuario_id: string;
  tipo: TipoNotificacion;
  mensaje: string;
  leida: boolean;
  fecha_envio: string;
  enlace: string | null;
  created_at: string;
}

export type InsertNotificacion = Omit<Notificacion, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export type UpdateNotificacion = Partial<Notificacion>;

export interface Database {
  public: {
    Tables: {
      Contenedores: {
        Row: Contenedor;
        Insert: InsertContenedor;
        Update: UpdateContenedor;
      };
      LecturasSensores: {
        Row: LecturaSensor;
        Insert: InsertLecturaSensor;
        Update: UpdateLecturaSensor;
      };
      Rutas: {
        Row: Ruta;
        Insert: InsertRuta;
        Update: UpdateRuta;
      };
      Usuarios: {
        Row: Usuario;
        Insert: InsertUsuario;
        Update: UpdateUsuario;
      };
      PuntosReciclaje: {
        Row: PuntosReciclaje;
        Insert: InsertPuntosReciclaje;
        Update: UpdatePuntosReciclaje;
      };
      HistorialRutas: {
        Row: HistorialRuta;
        Insert: InsertHistorialRuta;
        Update: UpdateHistorialRuta;
      };
      Notificaciones: {
        Row: Notificacion;
        Insert: InsertNotificacion;
        Update: UpdateNotificacion;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      tipo_residuo: TipoResiduo;
      estado_contenedor: EstadoContenedor;
      rol_usuario: RolUsuario;
      material_reciclaje: MaterialReciclaje;
      tipo_notificacion: TipoNotificacion;
    };
    CompositeTypes: Record<string, never>;
  };
}