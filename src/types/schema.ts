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
  | "repleto"
  | "vacio";

export type RolUsuario = "Admin" | "Gerente" | "Operador" | "Ciudadano";

export type EstadoSolicitud = "pendiente" | "aprobada" | "rechazada";

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

export type Contenedor = {
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

export type LecturaSensor = {
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

export type Ruta = {
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

export type Usuario = {
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

export type PuntosReciclaje = {
  id: string;
  usuario_id: string;
  contenedor_id: string | null;
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

export type HistorialRuta = {
  id: string;
  ruta_id: string | null;
  fecha_ejecucion: string;
  contenedores_recogidos: string[];
  tiempo_real: string | null;
  combustible_consumido: number | null;
  distancia_total: number | null;
  geometria: UbicacionPunto[] | null;
  observaciones: string | null;
  created_at: string;
}

export type InsertHistorialRuta = Omit<HistorialRuta, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export type UpdateHistorialRuta = Partial<HistorialRuta>;

export type Notificacion = {
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

export type SolicitudAcceso = {
  id: string;
  usuario_id: string;
  rol_solicitado: RolUsuario;
  estado: EstadoSolicitud;
  fecha_solicitud: string;
  revisado_por: string | null;
  fecha_revision: string | null;
}

export type InsertSolicitudAcceso = Omit<SolicitudAcceso, "id" | "fecha_solicitud" | "revisado_por" | "fecha_revision"> & {
  id?: string;
  fecha_solicitud?: string;
  revisado_por?: string | null;
  fecha_revision?: string | null;
};

export type UpdateSolicitudAcceso = Partial<SolicitudAcceso>;

export interface Database {
  public: {
    Tables: {
      Contenedores: {
        Row: Contenedor;
        Insert: InsertContenedor;
        Update: UpdateContenedor;
        Relationships: [];
      };
      LecturasSensores: {
        Row: LecturaSensor;
        Insert: InsertLecturaSensor;
        Update: UpdateLecturaSensor;
        Relationships: [];
      };
      Rutas: {
        Row: Ruta;
        Insert: InsertRuta;
        Update: UpdateRuta;
        Relationships: [];
      };
      Usuarios: {
        Row: Usuario;
        Insert: InsertUsuario;
        Update: UpdateUsuario;
        Relationships: [];
      };
      PuntosReciclaje: {
        Row: PuntosReciclaje;
        Insert: InsertPuntosReciclaje;
        Update: UpdatePuntosReciclaje;
        Relationships: [];
      };
      HistorialRutas: {
        Row: HistorialRuta;
        Insert: InsertHistorialRuta;
        Update: UpdateHistorialRuta;
        Relationships: [];
      };
      Notificaciones: {
        Row: Notificacion;
        Insert: InsertNotificacion;
        Update: UpdateNotificacion;
        Relationships: [];
      };
      SolicitudesAcceso: {
        Row: SolicitudAcceso;
        Insert: InsertSolicitudAcceso;
        Update: UpdateSolicitudAcceso;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      registrar_contenedor: {
        Args: {
          p_numero_identificacion: string;
          p_tipo_residuo: TipoResiduo;
          p_nivel_llenado: number;
          p_lat: number;
          p_lng: number;
          p_capacidad?: number;
          p_zona?: string | null;
          p_estado?: EstadoContenedor;
        };
        Returns: Json;
      };
      sembrar_contenedores_demo: {
        Args: Record<string, never>;
        Returns: number;
      };
      aprobar_solicitud_acceso: {
        Args: {
          p_solicitud_id: string;
          p_aprobar: boolean;
          p_rol_asignado?: RolUsuario | null;
          p_motivo_rechazo?: string | null;
        };
        Returns: Json;
      };
      crear_solicitud_acceso: {
        Args: {
          p_email: string;
          p_password: string;
          p_nombre: string;
          p_rol_solicitado: RolUsuario;
          p_justificacion?: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      tipo_residuo: TipoResiduo;
      estado_contenedor: EstadoContenedor;
      rol_usuario: RolUsuario;
      estado_solicitud: EstadoSolicitud;
      material_reciclaje: MaterialReciclaje;
      tipo_notificacion: TipoNotificacion;
    };
    CompositeTypes: Record<string, never>;
  };
}