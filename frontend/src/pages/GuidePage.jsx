import React from 'react'
import { useParams } from 'react-router-dom'

export default function GuidePage(){
  const { id } = useParams()
  return (
    <div className="p-6">
      <h2 className="text-2xl">Guide {id}</h2>
      <p className="mt-4">This is a sample guide page. Edit and expand as needed.</p>
    </div>
  )
}
