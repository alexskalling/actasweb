'use client';

import React, { useState } from 'react';
import { trackGTMEvent } from '@/utils/trackGTM';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function FormTestComponent() {
  const [eventData, setEventData] = useState({
    event: 'test_event',
    categoria: 'test_category',
    accion: 'test_action',
    etiqueta: 'test_label',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEventData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Enviando evento a GTM:', eventData);
    trackGTMEvent(eventData);
    alert('Evento enviado a GTM. Revisa la consola y el modo de vista previa de GTM.');
  };

  return (
    <div className="my-10 p-6 border rounded-lg bg-gray-50 max-w-2xl mx-auto">
      <h3 className="text-2xl font-bold mb-4 text-center text-gray-800">Formulario de Prueba GTM</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="event">Nombre del Evento (event)</Label>
          <Input
            type="text"
            id="event"
            name="event"
            value={eventData.event}
            onChange={handleChange}
            className="mt-1"
            required
          />
        </div>
        <div>
          <Label htmlFor="categoria">Categoría (categoria)</Label>
          <Input
            type="text"
            id="categoria"
            name="categoria"
            value={eventData.categoria}
            onChange={handleChange}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="accion">Acción (accion)</Label>
          <Input
            type="text"
            id="accion"
            name="accion"
            value={eventData.accion}
            onChange={handleChange}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="etiqueta">Etiqueta (etiqueta)</Label>
          <Input
            type="text"
            id="etiqueta"
            name="etiqueta"
            value={eventData.etiqueta}
            onChange={handleChange}
            className="mt-1"
          />
        </div>
        <Button type="submit" className="w-full bg-purple-700 hover:bg-purple-800">
          Enviar Evento de Prueba
        </Button>
      </form>
    </div>
  );
}