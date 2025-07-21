"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, Upload, Plus, Copy, ExternalLink } from "lucide-react"
import { useSupabase } from "@/components/providers"
import type { Marker } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"

export default function AdminDashboard() {
  const { supabase } = useSupabase()
  const [markers, setMarkers] = useState<Marker[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    markerImage: null as File | null,
    video: null as File | null,
    physicalWidth: 0.2,
  })

  useEffect(() => {
    fetchMarkers()
  }, [])

  const fetchMarkers = async () => {
    try {
      const response = await fetch("/api/markers")
      if (response.ok) {
        const data = await response.json()
        setMarkers(data)
      }
    } catch (error) {
      console.error("Error fetching markers:", error)
      toast({
        title: "Error",
        description: "Failed to fetch markers",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const uploadFile = async (file: File, bucket: string): Promise<string> => {
    const fileExt = file.name.split(".").pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file)

    if (uploadError) {
      throw uploadError
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)

    return data.publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.markerImage || !formData.video) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    setUploading(true)
    try {
      // Upload marker image
      const markerImageUrl = await uploadFile(formData.markerImage, "marker-images")

      // Upload video
      const videoUrl = await uploadFile(formData.video, "marker-videos")

      // Create marker record
      const response = await fetch("/api/markers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.title,
          marker_image_url: markerImageUrl,
          video_url: videoUrl,
          physical_width: formData.physicalWidth,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Marker created successfully",
        })
        setFormData({
          title: "",
          markerImage: null,
          video: null,
          physicalWidth: 0.2,
        })
        fetchMarkers()
      } else {
        throw new Error("Failed to create marker")
      }
    } catch (error) {
      console.error("Error creating marker:", error)
      toast({
        title: "Error",
        description: "Failed to create marker",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const deleteMarker = async (id: string) => {
    try {
      const response = await fetch(`/api/markers?id=${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Marker deleted successfully",
        })
        fetchMarkers()
      } else {
        throw new Error("Failed to delete marker")
      }
    } catch (error) {
      console.error("Error deleting marker:", error)
      toast({
        title: "Error",
        description: "Failed to delete marker",
        variant: "destructive",
      })
    }
  }

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    toast({
      title: "Copied",
      description: "URL copied to clipboard",
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">WebAR Ad Player Admin</h1>
        <Button asChild variant="outline">
          <a href="/" className="flex items-center gap-2">
            <ExternalLink className="w-4 h-4" />
            View AR Player
          </a>
        </Button>
      </div>

      {/* Upload Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add New AR Marker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter marker title"
                  required
                />
              </div>
              <div>
                <Label htmlFor="physicalWidth">Physical Width (meters)</Label>
                <Input
                  id="physicalWidth"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.physicalWidth}
                  onChange={(e) => setFormData({ ...formData, physicalWidth: Number.parseFloat(e.target.value) })}
                  placeholder="0.2"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="markerImage">Marker Image</Label>
                <Input
                  id="markerImage"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFormData({ ...formData, markerImage: e.target.files?.[0] || null })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="video">Video File</Label>
                <Input
                  id="video"
                  type="file"
                  accept="video/*"
                  onChange={(e) => setFormData({ ...formData, video: e.target.files?.[0] || null })}
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={uploading} className="w-full">
              {uploading ? (
                <>
                  <Upload className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Create Marker
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Markers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {markers.map((marker) => (
          <Card key={marker.id}>
            <CardHeader>
              <CardTitle className="text-lg">{marker.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={marker.marker_image_url || "/placeholder.svg"}
                  alt={marker.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <p>Physical Width: {marker.physical_width}m</p>
                <p>Created: {new Date(marker.created_at).toLocaleDateString()}</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => copyUrl(marker.marker_image_url)} className="flex-1">
                  <Copy className="w-4 h-4 mr-1" />
                  Image URL
                </Button>
                <Button variant="outline" size="sm" onClick={() => copyUrl(marker.video_url)} className="flex-1">
                  <Copy className="w-4 h-4 mr-1" />
                  Video URL
                </Button>
              </div>

              <Button variant="destructive" size="sm" onClick={() => deleteMarker(marker.id)} className="w-full">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {markers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No markers created yet.</p>
          <p className="text-gray-400">Upload your first marker image and video to get started.</p>
        </div>
      )}
    </div>
  )
}
